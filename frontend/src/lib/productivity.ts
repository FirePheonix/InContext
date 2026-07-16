import { differenceInDays, formatDistanceToNow, isToday, isYesterday } from "date-fns";

import { buildProjectAccessWhere, ensureWorkspaceAccessForUser } from "@/lib/project-access";
import { ensureProjectBootstrapData } from "@/lib/project-bootstrap";
import { prisma } from "@/lib/prisma";

type SummaryCard = {
  description: string;
  title: string;
  value: string;
};

export type ProductivityTask = {
  checked: boolean;
  tag: string;
  time: string;
  title: string;
};

export type ProjectHighlight = {
  description: string;
  due: string;
  progress: number;
  status: string;
  title: string;
};

export type RecentMemoryNote = {
  dateLabel: string;
  title: string;
  type: "document" | "summary";
};

export type ProductivityDashboardData = {
  highlights: ProjectHighlight[];
  notes: RecentMemoryNote[];
  summaryCards: SummaryCard[];
  tasks: ProductivityTask[];
};

function formatNoteDate(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return formatDistanceToNow(date, { addSuffix: true });
}

function buildProjectProgress(args: {
  documentCount: number;
  hasWritableToken: boolean;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PAUSED";
  summaryCount: number;
}) {
  const statusBoost = args.status === "ACTIVE" ? 20 : args.status === "DRAFT" ? 10 : args.status === "PAUSED" ? 6 : 0;
  const summaryScore = Math.min(args.summaryCount * 14, 35);
  const documentScore = Math.min(args.documentCount * 18, 35);
  const writeScore = args.hasWritableToken ? 10 : 0;

  return Math.min(statusBoost + summaryScore + documentScore + writeScore, 100);
}

export async function getProductivityDashboardData(actorId?: string): Promise<ProductivityDashboardData> {
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
        take: 3,
      },
      documents: {
        orderBy: { updatedAt: "desc" },
        take: 2,
      },
      accessTokens: {
        where: { revokedAt: null },
        orderBy: { updatedAt: "desc" },
      },
      commitLogs: {
        orderBy: { updatedAt: "desc" },
        take: 2,
      },
      agentConnections: {
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          accessTokens: true,
          documents: true,
          summaries: true,
        },
      },
    },
  });

  const activeProjects = projects.filter((project) => project.status === "ACTIVE").length;
  const onboardingProjects = projects.filter((project) => project.status === "DRAFT").length;
  const pendingHandoffs = projects.reduce(
    (count, project) => count + project.summaries.filter((summary) => summary.kind === "HANDOFF").length,
    0,
  );
  const writableRepos = projects.filter((project) => project.accessTokens.length > 0).length;

  const summaryCards: SummaryCard[] = [
    {
      title: "Projects",
      value: `${projects.length}`,
      description: `${activeProjects} active, ${onboardingProjects} onboarding`,
    },
    {
      title: "Pending handoffs",
      value: `${pendingHandoffs}`,
      description: "Portable summaries across Codex, Claude, and Cursor",
    },
    {
      title: "Writable repos",
      value: `${writableRepos}`,
      description: "Project-scoped tokens with commit audit history",
    },
  ];

  const taskPool: ProductivityTask[] = [];

  for (const project of projects) {
    const latestCommit = project.commitLogs[0];
    const latestToken = project.accessTokens[0];
    const staleAgent = project.agentConnections.find((connection) => {
      if (!connection.lastSyncedAt) {
        return false;
      }

      return Date.now() - connection.lastSyncedAt.getTime() > 1000 * 60 * 90;
    });
    const missingArchitectureDoc = !project.documents.some((document) => document.kind === "ARCHITECTURE");

    if (project.status === "DRAFT") {
      taskPool.push({
        title: `Finish onboarding flow for ${project.name}`,
        tag: "Onboarding",
        time: "Today",
        checked: false,
      });
    }

    if (latestCommit?.status === "FAILED") {
      taskPool.push({
        title: `Review failed commit policy for ${project.name}`,
        tag: "Security",
        time: "Today",
        checked: false,
      });
    }

    if (latestCommit?.status === "QUEUED") {
      taskPool.push({
        title: `Approve queued write intent for ${project.name}`,
        tag: "Approval",
        time: "Today",
        checked: false,
      });
    }

    if (latestToken?.expiresAt) {
      const daysUntilExpiry = differenceInDays(latestToken.expiresAt, new Date());

      if (daysUntilExpiry <= 14) {
        taskPool.push({
          title: `Rotate ${latestToken.label} for ${project.name}`,
          tag: "Security",
          time: daysUntilExpiry <= 0 ? "Overdue" : `${daysUntilExpiry}d`,
          checked: false,
        });
      }
    }

    if (staleAgent) {
      taskPool.push({
        title: `Resync ${staleAgent.label} context for ${project.name}`,
        tag: "Sync",
        time: "Next",
        checked: false,
      });
    }

    if (missingArchitectureDoc) {
      taskPool.push({
        title: `Add architecture baseline for ${project.name}`,
        tag: "Architecture",
        time: "Next",
        checked: false,
      });
    }
  }

  const tasks = taskPool.slice(0, 5);

  const highlights: ProjectHighlight[] = projects.slice(0, 3).map((project) => {
    const latestSummary = project.summaries[0];
    const progress = buildProjectProgress({
      status: project.status,
      summaryCount: project._count.summaries,
      documentCount: project._count.documents,
      hasWritableToken: project._count.accessTokens > 0,
    });

    return {
      title: project.name,
      status:
        project.status === "ACTIVE"
          ? "Active"
          : project.status === "DRAFT"
            ? "Designing"
            : project.status === "PAUSED"
              ? "Needs review"
              : "Archived",
      description: latestSummary?.content ?? project.description ?? "No project context captured yet.",
      progress,
      due: `Updated ${formatDistanceToNow(project.updatedAt, { addSuffix: true })}`,
    };
  });

  const notePool = [
    ...projects.flatMap((project) =>
      project.summaries.map((summary) => ({
        title: `${project.name} - ${summary.title}`,
        date: summary.updatedAt,
        type: "summary" as const,
      })),
    ),
    ...projects.flatMap((project) =>
      project.documents.map((document) => ({
        title: `${project.name} - ${document.title}`,
        date: document.updatedAt,
        type: "document" as const,
      })),
    ),
  ]
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, 4);

  const notes: RecentMemoryNote[] = notePool.map((note) => ({
    title: note.title,
    dateLabel: formatNoteDate(note.date),
    type: note.type,
  }));

  return {
    summaryCards,
    tasks,
    highlights,
    notes,
  };
}
