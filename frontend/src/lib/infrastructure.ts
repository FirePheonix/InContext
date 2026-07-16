import { formatDistanceToNow } from "date-fns";
import type { Prisma } from "@prisma/client";
import { siGithub, siNextdotjs, siNodedotjs, siReact } from "simple-icons";

import type {
  InfrastructureEnvironment,
  InfrastructureGroup,
  InfrastructureSummary,
} from "@/app/(main)/dashboard/infrastructure/_components/infrastructure-data";
import { buildProjectAccessWhere, ensureWorkspaceAccessForUser } from "@/lib/project-access";
import { ensureProjectBootstrapData } from "@/lib/project-bootstrap";
import { prisma } from "@/lib/prisma";

type InfrastructureProject = Prisma.ProjectGetPayload<{
  include: {
    summaries: true;
    documents: true;
    accessTokens: true;
    agentConnections: true;
    commitLogs: true;
    _count: {
      select: {
        documents: true;
        summaries: true;
      };
    };
  };
}>;

function getHealth(date: Date | null | undefined): InfrastructureEnvironment["health"] {
  if (!date) {
    return "Blocked";
  }

  const ageMs = Date.now() - date.getTime();

  if (ageMs <= 1000 * 60 * 45) {
    return "Synced";
  }

  if (ageMs <= 1000 * 60 * 180) {
    return "Lagging";
  }

  return "Blocked";
}

function formatFreshness(date: Date | null | undefined) {
  return date ? formatDistanceToNow(date, { addSuffix: true }) : "Never";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getAgentAdapter(agent: "CLAUDE" | "CODEX" | "CURSOR" | "OTHER", label: string) {
  if (agent === "CODEX") {
    return { name: label, icon: siNodedotjs };
  }

  if (agent === "CLAUDE") {
    return { name: label, icon: siReact };
  }

  if (agent === "CURSOR") {
    return { name: label, icon: siNextdotjs };
  }

  return { name: label, icon: siGithub };
}

function buildContextRow(project: InfrastructureProject): InfrastructureEnvironment {
  const latestSummary = project.summaries[0]?.updatedAt;
  const latestDocument = project.documents[0]?.updatedAt;
  const latestDate =
    latestSummary && latestDocument
      ? new Date(Math.max(latestSummary.getTime(), latestDocument.getTime()))
      : latestSummary ?? latestDocument ?? project.updatedAt;
  const writableToken = project.accessTokens.find((token) => token.revokedAt === null);

  return {
    source: `${project.contextPath ?? "memory"}/summaries + ${project.architecturePath ?? "docs"}`,
    adapter: {
      name: "Context index",
      icon: siNextdotjs,
    },
    mode: writableToken ? "Writable" : project.status === "DRAFT" ? "Planned" : "Read-only",
    health: getHealth(latestDate),
    freshness: formatFreshness(latestDate),
    coverage: `${project._count.summaries} summaries / ${project._count.documents} docs`,
    token: writableToken?.label ?? "Local project context",
    scope: writableToken?.scopes ?? "project:read",
    resources: {
      recall: clamp(project._count.summaries * 18 + 24),
      architecture: clamp(project._count.documents * 28 + 16),
      write: clamp((writableToken ? 42 : 0) + project.commitLogs.length * 12),
    },
  };
}

export async function getInfrastructurePageData(actorId?: string): Promise<{
  groups: InfrastructureGroup[];
  summary: InfrastructureSummary;
}> {
  await ensureProjectBootstrapData();

  if (actorId) {
    await ensureWorkspaceAccessForUser(actorId);
  }

  const projects = await prisma.project.findMany({
    where: buildProjectAccessWhere(actorId),
    orderBy: { updatedAt: "desc" },
    include: {
      summaries: {
        orderBy: { updatedAt: "desc" },
      },
      documents: {
        orderBy: { updatedAt: "desc" },
      },
      accessTokens: {
        orderBy: { updatedAt: "desc" },
      },
      agentConnections: {
        orderBy: { updatedAt: "desc" },
      },
      commitLogs: {
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          documents: true,
          summaries: true,
        },
      },
    },
  });

  const groups: InfrastructureGroup[] = projects.map((project) => {
    const rows: InfrastructureEnvironment[] = [buildContextRow(project)];

    for (const connection of project.agentConnections) {
      const linkedToken = project.accessTokens.find((token) => token.revokedAt === null);
      const health = getHealth(connection.lastSyncedAt);

      rows.push({
        source:
          connection.agent === "OTHER"
            ? project.repoUrl ?? project.contextPath ?? project.name
            : `${project.contextPath ?? "memory"}/${connection.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        adapter: getAgentAdapter(connection.agent, connection.label),
        mode: linkedToken ? "Writable" : "Read-only",
        health,
        freshness: formatFreshness(connection.lastSyncedAt),
        coverage:
          connection.agent === "OTHER"
            ? `${project._count.documents} architecture files`
            : `${project._count.summaries} captured turns`,
        token: linkedToken?.label ?? "Local filesystem",
        scope: linkedToken?.scopes ?? "session:read",
        resources: {
          recall: clamp(project._count.summaries * 16 + (connection.agent === "OTHER" ? 12 : 32)),
          architecture: clamp(project._count.documents * 20 + (connection.agent === "OTHER" ? 30 : 18)),
          write: clamp((linkedToken ? 45 : 0) + (health === "Synced" ? 28 : 12)),
        },
      });
    }

    for (const token of project.accessTokens) {
      rows.push({
        source: project.repoUrl ?? `${project.slug}/${project.defaultBranch}`,
        adapter: {
          name: token.provider === "github" ? "Git bridge" : "Token bridge",
          icon: token.provider === "github" ? siGithub : siNodedotjs,
        },
        mode: token.revokedAt ? "Planned" : "Writable",
        health: token.revokedAt ? "Blocked" : token.expiresAt && token.expiresAt < new Date() ? "Lagging" : "Synced",
        freshness: formatFreshness(token.lastUsedAt),
        coverage: `${project.commitLogs.length} commit intents`,
        token: token.label,
        scope: token.scopes,
        resources: {
          recall: clamp(project._count.summaries * 8 + 20),
          architecture: clamp(project._count.documents * 18 + 24),
          write: clamp(token.revokedAt ? 20 : token.expiresAt && token.expiresAt < new Date() ? 72 : 88),
        },
      });
    }

    return {
      name: project.slug,
      organization: project.description ?? project.name,
      rows,
    };
  });

  const flattenedRows = groups.flatMap((group) => group.rows);
  const latestUpdate = projects[0]?.updatedAt ?? new Date();
  const syncedRows = flattenedRows.filter((row) => row.health === "Synced").length;
  const writableRows = flattenedRows.filter((row) => row.mode === "Writable").length;

  return {
    groups,
    summary: {
      freshContextPercent: flattenedRows.length > 0 ? Math.round((syncedRows / flattenedRows.length) * 100) : 0,
      lastUpdatedLabel: formatDistanceToNow(latestUpdate, { addSuffix: true }),
      projectCount: projects.length,
      sourceCount: flattenedRows.length,
      writablePathCount: writableRows,
    },
  };
}
