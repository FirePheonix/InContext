import { prisma } from "@/lib/prisma";
import { buildProjectAccessWhere } from "@/lib/project-access";
import { ensureProjectBootstrapData } from "@/lib/project-bootstrap";

export type CreateProjectInput = {
  architecturePath?: string;
  contextPath?: string;
  defaultBranch?: string;
  directCommitEnabled?: boolean;
  description?: string;
  name: string;
  repoLocalPath?: string;
  repoUrl?: string;
  slug?: string;
};

export type CreateSummaryInput = {
  content: string;
  isPinned?: boolean;
  kind?: "DECISION" | "GOAL" | "HANDOFF" | "PROGRESS";
  sourceSession?: string;
  title: string;
};

export type CreateCommitIntentInput = {
  branch?: string;
  files?: string[];
  message: string;
  tokenLabel?: string;
};

const DEFAULT_OWNER_EMAIL = "owner@incontext.local";
const DEFAULT_OWNER_NAME = "InContext Owner";

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getOrCreateOwner() {
  await ensureProjectBootstrapData();

  const existing = await prisma.user.findUnique({
    where: { email: DEFAULT_OWNER_EMAIL },
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      email: DEFAULT_OWNER_EMAIL,
      name: DEFAULT_OWNER_NAME,
    },
  });
}

export async function createProject(input: CreateProjectInput, actorId?: string) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Project name is required.");
  }

  const owner = actorId ? await prisma.user.findUnique({ where: { id: actorId } }) : await getOrCreateOwner();
  const fallbackOwner = owner ?? (await getOrCreateOwner());
  const baseSlug = toSlug(input.slug?.trim() || name);

  if (!baseSlug) {
    throw new Error("Project slug could not be generated.");
  }

  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.project.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return prisma.project.create({
    data: {
      name,
      slug,
      description: input.description?.trim() || null,
      repoUrl: input.repoUrl?.trim() || null,
      repoLocalPath: input.repoLocalPath?.trim() || null,
      defaultBranch: input.defaultBranch?.trim() || "main",
      directCommitEnabled: input.directCommitEnabled ?? false,
      contextPath: input.contextPath?.trim() || null,
      architecturePath: input.architecturePath?.trim() || null,
      status: "DRAFT",
      createdById: fallbackOwner.id,
      memberships: {
        create: {
          userId: fallbackOwner.id,
          role: "OWNER",
        },
      },
      summaries: {
        create: {
          title: "Project created",
          kind: "GOAL",
          content: `Bootstrap context created for ${name}.`,
          authorId: fallbackOwner.id,
          isPinned: true,
        },
      },
    },
  });
}

export async function getProjectRegistry(actorId?: string) {
  await ensureProjectBootstrapData();

  const projects = await prisma.project.findMany({
    where: buildProjectAccessWhere(actorId),
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          accessTokens: true,
          documents: true,
          summaries: true,
        },
      },
    },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: project.status,
    repoUrl: project.repoUrl,
    repoLocalPath: project.repoLocalPath,
    defaultBranch: project.defaultBranch,
    directCommitEnabled: project.directCommitEnabled,
    contextPath: project.contextPath,
    architecturePath: project.architecturePath,
    updatedAt: project.updatedAt.toISOString(),
    counts: project._count,
  }));
}

export async function getProjectDetail(slug: string, actorId?: string) {
  await ensureProjectBootstrapData();

  const project = await prisma.project.findFirst({
    where: {
      slug,
      ...(buildProjectAccessWhere(actorId) ?? {}),
    },
    include: {
      createdBy: true,
      memberships: {
        include: {
          user: true,
        },
      },
      summaries: {
        orderBy: { updatedAt: "desc" },
      },
      documents: {
        orderBy: { updatedAt: "desc" },
      },
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
        include: {
          actor: true,
          token: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: project.status,
    repoUrl: project.repoUrl,
    repoLocalPath: project.repoLocalPath,
    defaultBranch: project.defaultBranch,
    directCommitEnabled: project.directCommitEnabled,
    contextPath: project.contextPath,
    architecturePath: project.architecturePath,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    createdBy: {
      id: project.createdBy.id,
      name: project.createdBy.name,
      email: project.createdBy.email,
    },
    memberships: project.memberships.map((membership) => ({
      id: membership.id,
      role: membership.role,
      user: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
      },
    })),
    summaries: project.summaries.map((summary) => ({
      id: summary.id,
      title: summary.title,
      kind: summary.kind,
      content: summary.content,
      sourceSession: summary.sourceSession,
      isPinned: summary.isPinned,
      createdAt: summary.createdAt.toISOString(),
      updatedAt: summary.updatedAt.toISOString(),
    })),
    documents: project.documents.map((document) => ({
      id: document.id,
      title: document.title,
      kind: document.kind,
      path: document.path,
      checksum: document.checksum,
      lastIndexedAt: document.lastIndexedAt?.toISOString() ?? null,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    })),
    agents: project.agentConnections.map((connection) => ({
      id: connection.id,
      label: connection.label,
      agent: connection.agent,
      configJson: connection.configJson,
      lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
      updatedAt: connection.updatedAt.toISOString(),
    })),
    tokens: project.accessTokens.map((token) => ({
      id: token.id,
      label: token.label,
      provider: token.provider,
      kind: token.kind,
      scopes: token.scopes,
      lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
      expiresAt: token.expiresAt?.toISOString() ?? null,
      revokedAt: token.revokedAt?.toISOString() ?? null,
      owner: {
        id: token.owner?.id ?? null,
        name: token.owner?.name ?? null,
        email: token.owner?.email ?? null,
      },
      updatedAt: token.updatedAt.toISOString(),
    })),
    commits: project.commitLogs.map((commit) => ({
      id: commit.id,
      branch: commit.branch,
      message: commit.message,
      status: commit.status,
      filesJson: commit.filesJson,
      commitSha: commit.commitSha,
      pullRequestUrl: commit.pullRequestUrl,
      errorMessage: commit.errorMessage,
      actor: {
        id: commit.actor?.id ?? null,
        name: commit.actor?.name ?? null,
        email: commit.actor?.email ?? null,
      },
      tokenLabel: commit.token?.label ?? null,
      createdAt: commit.createdAt.toISOString(),
      updatedAt: commit.updatedAt.toISOString(),
    })),
  };
}

export async function createProjectSummary(slug: string, input: CreateSummaryInput, actorId?: string) {
  const project = await prisma.project.findFirst({
    where: {
      slug,
      ...(buildProjectAccessWhere(actorId) ?? {}),
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId } }) : await getOrCreateOwner();
  const fallbackActor = actor ?? (await getOrCreateOwner());
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) {
    throw new Error("Summary title is required.");
  }

  if (!content) {
    throw new Error("Summary content is required.");
  }

  return prisma.projectSummary.create({
    data: {
      projectId: project.id,
      authorId: fallbackActor.id,
      title,
      kind: input.kind ?? "PROGRESS",
      content,
      sourceSession: input.sourceSession?.trim() || null,
      isPinned: input.isPinned ?? false,
    },
  });
}

export async function createCommitIntent(slug: string, input: CreateCommitIntentInput, actorId?: string) {
  const project = await prisma.project.findFirst({
    where: {
      slug,
      ...(buildProjectAccessWhere(actorId) ?? {}),
    },
    include: {
      accessTokens: true,
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId } }) : await getOrCreateOwner();
  const fallbackActor = actor ?? (await getOrCreateOwner());
  const message = input.message.trim();

  if (!message) {
    throw new Error("Commit message is required.");
  }

  const token = input.tokenLabel
    ? (project.accessTokens.find((candidate) => candidate.label === input.tokenLabel) ?? null)
    : (project.accessTokens[0] ?? null);

  return prisma.commitLog.create({
    data: {
      projectId: project.id,
      tokenId: token?.id ?? null,
      actorId: fallbackActor.id,
      branch: input.branch?.trim() || project.defaultBranch,
      message,
      status: "QUEUED",
      filesJson: JSON.stringify(input.files ?? []),
    },
  });
}
