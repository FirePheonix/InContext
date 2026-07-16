import { format } from "date-fns";
import type { Prisma } from "@prisma/client";

import type { Role } from "@/app/(main)/dashboard/roles/_components/roles-table/data";
import { buildProjectAccessWhere, ensureWorkspaceAccessForUser } from "@/lib/project-access";
import { ensureProjectBootstrapData } from "@/lib/project-bootstrap";
import { prisma } from "@/lib/prisma";

type GovernedProject = Prisma.ProjectGetPayload<{
  include: {
    agentConnections: true;
    accessTokens: {
      include: {
        owner: true;
      };
    };
    commitLogs: true;
    documents: true;
  };
}>;

function ownerLabel(name: string | null | undefined) {
  if (!name) {
    return "Platform";
  }

  if (name.includes("Security")) {
    return "Security";
  }

  if (name.includes("Operations")) {
    return "Ops";
  }

  return "Platform";
}

function formatScope(scope: string) {
  return scope
    .replace(/[_:]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildBuiltInAgentRoles(projects: GovernedProject[]): Role[] {
  const labels: Array<{
    accessLevel: string;
    agent: "CLAUDE" | "CODEX" | "CURSOR";
    owner: string;
    permissionSets: string[];
    role: string;
  }> = [
    {
      agent: "CODEX",
      role: "Codex CLI",
      accessLevel: "Read + write",
      owner: "Platform",
      permissionSets: ["Project summaries", "Session recall", "Architecture notes", "Draft changes"],
    },
    {
      agent: "CLAUDE",
      role: "Claude Code",
      accessLevel: "Read + propose",
      owner: "Platform",
      permissionSets: ["Project summaries", "Session recall", "Architecture drafts", "Handoff notes"],
    },
    {
      agent: "CURSOR",
      role: "Cursor",
      accessLevel: "Read only",
      owner: "Platform",
      permissionSets: ["Project summaries", "Session recall", "Architecture notes"],
    },
  ];

  return labels
    .map((entry) => {
      const connections = projects.flatMap((project) =>
        project.agentConnections.filter((connection) => connection.agent === entry.agent),
      );

      if (connections.length === 0) {
        return null;
      }

      const lastReviewDate = connections.reduce(
        (latest, connection) => (connection.updatedAt > latest ? connection.updatedAt : latest),
        connections[0].updatedAt,
      );
      const needsReview = connections.some((connection) => {
        if (!connection.lastSyncedAt) {
          return true;
        }

        return Date.now() - connection.lastSyncedAt.getTime() > 1000 * 60 * 180;
      });

      return {
        role: entry.role,
        group: "Built-in agents",
        accessLevel: entry.accessLevel,
        users: connections.length,
        permissionSets: entry.permissionSets,
        lastReview: format(lastReviewDate, "MMM d, yyyy"),
        owner: entry.owner,
        status: needsReview ? "Needs review" : "Active",
      } satisfies Role;
    })
    .filter((role): role is Role => Boolean(role));
}

export async function getAccessGovernanceData(actorId?: string): Promise<Role[]> {
  await ensureProjectBootstrapData();

  if (actorId) {
    await ensureWorkspaceAccessForUser(actorId);
  }

  const projects = await prisma.project.findMany({
    where: buildProjectAccessWhere(actorId),
    orderBy: { updatedAt: "desc" },
    include: {
      agentConnections: {
        orderBy: { updatedAt: "desc" },
      },
      accessTokens: {
        include: {
          owner: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      commitLogs: {
        orderBy: { updatedAt: "desc" },
      },
      documents: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  const builtInRoles = buildBuiltInAgentRoles(projects);
  const tokenRoles: Role[] = projects.flatMap((project) =>
    project.accessTokens.map((token) => {
      const daysToExpiry = token.expiresAt ? (token.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24) : 999;
      const broadRepoScope = token.scopes.includes("repo");
      const status: Role["status"] = token.revokedAt || broadRepoScope || daysToExpiry <= 14 ? "Needs review" : "Active";

      return {
        role: token.label,
        group: "Write tokens",
        accessLevel:
          token.scopes.includes("write") || token.scopes.includes("repo") ? "Scoped write" : "Read only",
        users: 1,
        permissionSets: token.scopes.split(",").map((scope) => formatScope(scope.trim())),
        lastReview: format(token.updatedAt, "MMM d, yyyy"),
        owner: ownerLabel(token.owner?.name),
        status,
      };
    }),
  );

  const reviewRoles: Role[] = [
    {
      role: "Audit trail",
      group: "Review only",
      accessLevel: "Read only",
      users: projects.reduce((count, project) => count + project.commitLogs.length, 0),
      permissionSets: ["Policy diffs", "Write history", "Token usage"],
      lastReview: format(projects[0]?.updatedAt ?? new Date(), "MMM d, yyyy"),
      owner: "Ops",
      status: "Active",
    },
    {
      role: "Architecture reviewer",
      group: "Review only",
      accessLevel: "Scoped",
      users: projects.reduce((count, project) => count + project.documents.length, 0),
      permissionSets: ["Architecture drafts", "Decision logs", "Approval queue"],
      lastReview: format(projects[0]?.updatedAt ?? new Date(), "MMM d, yyyy"),
      owner: "Ops",
      status: "Active",
    },
    {
      role: "Project creator flow",
      group: "Review only",
      accessLevel: "Scoped",
      users: projects.filter((project) => project.status === "DRAFT").length,
      permissionSets: ["Registry writes", "Starter summary", "Onboarding checklist"],
      lastReview: format(projects[0]?.updatedAt ?? new Date(), "MMM d, yyyy"),
      owner: "Platform",
      status: "Active",
    },
  ];

  return [...builtInRoles, ...tokenRoles, ...reviewRoles];
}
