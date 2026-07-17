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

export type UpdateProjectInput = {
  architecturePath?: string;
  contextPath?: string;
  defaultBranch?: string;
  description?: string;
  directCommitEnabled?: boolean;
  name?: string;
  repoLocalPath?: string;
  repoUrl?: string;
  slug?: string;
  status?: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PAUSED";
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

export type RecordProjectCommitInput = {
  branch?: string;
  commitSha?: string;
  errorMessage?: string;
  files?: string[];
  message: string;
  pullRequestUrl?: string;
  status: "FAILED" | "QUEUED" | "SUCCEEDED";
};

export type ActivityActor = {
  cliDeviceId?: string;
  cliSessionId?: string;
  userId: string;
};

export type UpsertProjectNotebookInput = {
  agentConnectionId?: string;
  agentLabel?: string;
  content: string;
  title?: string;
};

export type CreateProjectAgentInput = {
  agent: "CLAUDE" | "CODEX" | "CURSOR" | "OTHER";
  label: string;
  lastSyncedAt?: string;
  positionX?: number;
  positionY?: number;
  status?: "ACTIVE" | "IDLE" | "WAITING" | "BLOCKED";
};

export type UpdateProjectAgentInput = {
  label?: string;
  lastSyncedAt?: string | null;
  positionX?: number;
  positionY?: number;
  status?: "ACTIVE" | "IDLE" | "WAITING" | "BLOCKED";
};

export type ProjectWorkspaceData = {
  activity: Array<{
    action: string;
    createdAt: string;
    detail: Record<string, unknown>;
    id: string;
    targetId: string | null;
    targetType: string | null;
    user: {
      email: string | null;
      id: string;
      name: string | null;
    };
  }>;
  agents: Array<{
    agent: "CLAUDE" | "CODEX" | "CURSOR" | "OTHER";
    id: string;
    label: string;
    lastSyncedAt: string | null;
    position: {
      x: number | null;
      y: number | null;
    };
    status: string;
    updatedAt: string;
    user: {
      email: string | null;
      id: string;
      name: string | null;
    } | null;
  }>;
  notebook: {
    author: {
      email: string | null;
      id: string;
      name: string | null;
    } | null;
    content: string;
    id: string;
    title: string;
    updatedAt: string;
  } | null;
  project: {
    defaultBranch: string;
    description: string | null;
    directCommitEnabled: boolean;
    id: string;
    name: string;
    repoLocalPath: string | null;
    repoUrl: string | null;
    slug: string;
    status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PAUSED";
    updatedAt: string;
  };
};

const DEFAULT_OWNER_EMAIL = "owner@incontext.local";
const DEFAULT_OWNER_NAME = "InContext Owner";
const DEFAULT_AGENT_POSITIONS = [
  { x: 80, y: 90 },
  { x: 110, y: 360 },
  { x: 860, y: 120 },
  { x: 820, y: 380 },
  { x: 470, y: 560 },
];

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseJsonObject(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore malformed config payloads from older rows.
  }

  return {};
}

function getDefaultAgentPosition(index: number) {
  return DEFAULT_AGENT_POSITIONS[index] ?? { x: 120 + index * 26, y: 110 + index * 56 };
}

function resolveNextAgentPosition(
  agentConnections: Array<{
    configJson: string | null;
  }>,
  input: Pick<CreateProjectAgentInput, "positionX" | "positionY">,
) {
  if (typeof input.positionX === "number" && typeof input.positionY === "number") {
    return {
      x: input.positionX,
      y: input.positionY,
    };
  }

  const occupied = new Set(
    agentConnections.flatMap((connection, index) => {
      const metadata = parseJsonObject(connection.configJson);
      const fallback = getDefaultAgentPosition(index);
      const x = typeof metadata.positionX === "number" ? metadata.positionX : fallback.x;
      const y = typeof metadata.positionY === "number" ? metadata.positionY : fallback.y;

      return [`${x}:${y}`];
    }),
  );

  let candidateIndex = 0;

  while (candidateIndex < agentConnections.length + 12) {
    const candidate = getDefaultAgentPosition(candidateIndex);

    if (!occupied.has(`${candidate.x}:${candidate.y}`)) {
      return candidate;
    }

    candidateIndex += 1;
  }

  return getDefaultAgentPosition(agentConnections.length);
}

async function buildUniqueProjectSlug(projectId: string, rawSlug: string) {
  const baseSlug = toSlug(rawSlug);

  if (!baseSlug) {
    throw new Error("Project slug could not be generated.");
  }

  const existing = await prisma.project.findFirst({
    where: {
      slug: baseSlug,
      NOT: { id: projectId },
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("Another project already uses that slug.");
  }

  return baseSlug;
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

  const project = await prisma.project.create({
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
      notebook: {
        create: {
          authorId: fallbackOwner.id,
          title: `${name} notebook`,
          content: input.description?.trim() || `Shared notebook for ${name}.`,
        },
      },
    },
  });

  if (actorId) {
    await prisma.auditEvent.create({
      data: {
        userId: actorId,
        projectId: project.id,
        action: "project.created",
        targetType: "project",
        targetId: project.id,
        detailJson: JSON.stringify({
          name: project.name,
          slug: project.slug,
        }),
      },
    });
  }

  return project;
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
      notebook: true,
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
    notebook: project.notebook
      ? {
          id: project.notebook.id,
          title: project.notebook.title,
          content: project.notebook.content,
          authorId: project.notebook.authorId,
          createdAt: project.notebook.createdAt.toISOString(),
          updatedAt: project.notebook.updatedAt.toISOString(),
        }
      : null,
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

export async function updateProject(slug: string, input: UpdateProjectInput, actorId?: string) {
  const project = await prisma.project.findFirst({
    where: {
      slug,
      ...(buildProjectAccessWhere(actorId) ?? {}),
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  const name = input.name?.trim();
  const nextSlug = input.slug?.trim() ? await buildUniqueProjectSlug(project.id, input.slug) : project.slug;

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      name: name || project.name,
      slug: nextSlug,
      description: input.description === undefined ? project.description : input.description.trim() || null,
      repoUrl: input.repoUrl === undefined ? project.repoUrl : input.repoUrl.trim() || null,
      repoLocalPath: input.repoLocalPath === undefined ? project.repoLocalPath : input.repoLocalPath.trim() || null,
      defaultBranch: input.defaultBranch?.trim() || project.defaultBranch,
      directCommitEnabled: input.directCommitEnabled ?? project.directCommitEnabled,
      contextPath: input.contextPath === undefined ? project.contextPath : input.contextPath.trim() || null,
      architecturePath:
        input.architecturePath === undefined ? project.architecturePath : input.architecturePath.trim() || null,
      status: input.status ?? project.status,
    },
  });

  if (actorId) {
    await prisma.auditEvent.create({
      data: {
        userId: actorId,
        projectId: updated.id,
        action: "project.updated",
        targetType: "project",
        targetId: updated.id,
        detailJson: JSON.stringify({
          name: updated.name,
          slug: updated.slug,
          status: updated.status,
        }),
      },
    });
  }

  return updated;
}

export async function deleteProject(slug: string, actorId?: string) {
  const project = await prisma.project.findFirst({
    where: {
      slug,
      ...(buildProjectAccessWhere(actorId) ?? {}),
    },
    select: { id: true },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  if (actorId) {
    await prisma.auditEvent.create({
      data: {
        userId: actorId,
        action: "project.deleted",
        targetType: "project",
        targetId: project.id,
        detailJson: JSON.stringify({
          slug,
        }),
      },
    });
  }

  await prisma.project.delete({
    where: { id: project.id },
  });

  return { deleted: true };
}

export async function getProjectWorkspace(slug: string, actorId?: string): Promise<ProjectWorkspaceData | null> {
  await ensureProjectBootstrapData();

  const project = await prisma.project.findFirst({
    where: {
      slug,
      ...(buildProjectAccessWhere(actorId) ?? {}),
    },
    include: {
      notebook: {
        include: {
          author: true,
        },
      },
      agentConnections: {
        orderBy: [{ updatedAt: "desc" }],
        include: {
          user: true,
        },
      },
      auditEvents: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: {
          user: true,
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status,
      repoUrl: project.repoUrl,
      repoLocalPath: project.repoLocalPath,
      defaultBranch: project.defaultBranch,
      directCommitEnabled: project.directCommitEnabled,
      updatedAt: project.updatedAt.toISOString(),
    },
    notebook: project.notebook
      ? {
          id: project.notebook.id,
          title: project.notebook.title,
          content: project.notebook.content,
          updatedAt: project.notebook.updatedAt.toISOString(),
          author: project.notebook.author
            ? {
                id: project.notebook.author.id,
                name: project.notebook.author.name,
                email: project.notebook.author.email,
              }
            : null,
        }
      : null,
    agents: project.agentConnections.map((connection) => {
      const metadata = parseJsonObject(connection.configJson);

      return {
        id: connection.id,
        label: connection.label,
        agent: connection.agent,
        status: typeof metadata.status === "string" ? metadata.status : "IDLE",
        position: {
          x: typeof metadata.positionX === "number" ? metadata.positionX : null,
          y: typeof metadata.positionY === "number" ? metadata.positionY : null,
        },
        lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
        user: connection.user
          ? {
              id: connection.user.id,
              name: connection.user.name,
              email: connection.user.email,
            }
          : null,
        updatedAt: connection.updatedAt.toISOString(),
      };
    }),
    activity: project.auditEvents.map((event) => ({
      id: event.id,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      detail: parseJsonObject(event.detailJson),
      createdAt: event.createdAt.toISOString(),
      user: {
        id: event.user.id,
        name: event.user.name,
        email: event.user.email,
      },
    })),
  };
}

export async function upsertProjectNotebook(slug: string, input: UpsertProjectNotebookInput, actor: ActivityActor) {
  const project = await prisma.project.findFirst({
    where: {
      slug,
      ...(buildProjectAccessWhere(actor.userId) ?? {}),
    },
    include: {
      notebook: true,
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  const title = input.title?.trim() || project.notebook?.title || `${project.name} notebook`;
  const content = input.content.trim();

  if (!content) {
    throw new Error("Notebook content is required.");
  }

  const notebook = project.notebook
    ? await prisma.projectNotebook.update({
        where: { id: project.notebook.id },
        data: {
          authorId: actor.userId,
          title,
          content,
        },
      })
    : await prisma.projectNotebook.create({
        data: {
          projectId: project.id,
          authorId: actor.userId,
          title,
          content,
        },
      });

  await prisma.auditEvent.create({
    data: {
      userId: actor.userId,
      projectId: project.id,
      deviceId: actor.cliDeviceId,
      cliSessionId: actor.cliSessionId,
      action: "project.notebook.updated",
      targetType: "project_notebook",
      targetId: notebook.id,
      detailJson: JSON.stringify({
        agentConnectionId: input.agentConnectionId ?? null,
        agentLabel: input.agentLabel ?? null,
        title,
      }),
    },
  });

  return notebook;
}

export async function createProjectAgentConnection(slug: string, input: CreateProjectAgentInput, actor: ActivityActor) {
  const project = await prisma.project.findFirst({
    where: {
      slug,
      ...(buildProjectAccessWhere(actor.userId) ?? {}),
    },
    include: {
      agentConnections: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  const label = input.label.trim();

  if (!label) {
    throw new Error("Agent label is required.");
  }

  const position = resolveNextAgentPosition(project.agentConnections, input);

  const connection = await prisma.agentConnection.create({
    data: {
      projectId: project.id,
      userId: actor.userId,
      label,
      agent: input.agent,
      lastSyncedAt: input.lastSyncedAt ? new Date(input.lastSyncedAt) : new Date(),
      configJson: JSON.stringify({
        positionX: position.x,
        positionY: position.y,
        status: input.status ?? "ACTIVE",
        cliSessionId: actor.cliSessionId ?? null,
        cliDeviceId: actor.cliDeviceId ?? null,
      }),
    },
  });

  await prisma.auditEvent.create({
    data: {
      userId: actor.userId,
      projectId: project.id,
      deviceId: actor.cliDeviceId,
      cliSessionId: actor.cliSessionId,
      action: "project.agent.created",
      targetType: "agent_connection",
      targetId: connection.id,
      detailJson: JSON.stringify({
        label,
        agent: input.agent,
        status: input.status ?? "ACTIVE",
      }),
    },
  });

  return connection;
}

export async function updateProjectAgentConnection(
  slug: string,
  agentId: string,
  input: UpdateProjectAgentInput,
  actor: ActivityActor,
) {
  const project = await prisma.project.findFirst({
    where: {
      slug,
      ...(buildProjectAccessWhere(actor.userId) ?? {}),
    },
    include: {
      agentConnections: {
        where: { id: agentId },
      },
    },
  });

  const connection = project?.agentConnections[0];

  if (!project || !connection) {
    throw new Error("Agent connection not found.");
  }

  const metadata = parseJsonObject(connection.configJson);
  const nextMetadata = {
    ...metadata,
    positionX: input.positionX ?? metadata.positionX ?? null,
    positionY: input.positionY ?? metadata.positionY ?? null,
    status: input.status ?? metadata.status ?? "IDLE",
  };
  let nextLastSyncedAt: Date | null = new Date();

  if (input.lastSyncedAt === null) {
    nextLastSyncedAt = null;
  } else if (input.lastSyncedAt) {
    nextLastSyncedAt = new Date(input.lastSyncedAt);
  }

  const updated = await prisma.agentConnection.update({
    where: { id: connection.id },
    data: {
      label: input.label?.trim() || connection.label,
      lastSyncedAt: nextLastSyncedAt,
      configJson: JSON.stringify(nextMetadata),
    },
  });

  await prisma.auditEvent.create({
    data: {
      userId: actor.userId,
      projectId: project.id,
      deviceId: actor.cliDeviceId,
      cliSessionId: actor.cliSessionId,
      action: "project.agent.updated",
      targetType: "agent_connection",
      targetId: updated.id,
      detailJson: JSON.stringify({
        label: updated.label,
        status: nextMetadata.status,
        positionX: nextMetadata.positionX,
        positionY: nextMetadata.positionY,
      }),
    },
  });

  return updated;
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

export async function recordProjectCommit(slug: string, input: RecordProjectCommitInput, actorId?: string) {
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
  const message = input.message.trim();

  if (!message) {
    throw new Error("Commit message is required.");
  }

  const commit = await prisma.commitLog.create({
    data: {
      projectId: project.id,
      actorId: fallbackActor.id,
      branch: input.branch?.trim() || project.defaultBranch,
      message,
      status: input.status,
      filesJson: JSON.stringify(input.files ?? []),
      commitSha: input.commitSha?.trim() || null,
      pullRequestUrl: input.pullRequestUrl?.trim() || null,
      errorMessage: input.errorMessage?.trim() || null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      userId: fallbackActor.id,
      projectId: project.id,
      action: "project.commit_recorded",
      targetType: "commit_log",
      targetId: commit.id,
      detailJson: JSON.stringify({
        branch: commit.branch,
        commitSha: commit.commitSha,
        status: commit.status,
      }),
    },
  });

  return commit;
}
