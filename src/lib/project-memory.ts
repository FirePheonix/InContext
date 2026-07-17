import type { AgentKind, CommitStatus, DocumentKind, ObservationStatus, SummaryKind } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildProjectAccessWhere } from "@/lib/project-access";
import { type ActivityActor, createProject, updateProject, upsertProjectNotebook } from "@/lib/project-service";

export type CreateProjectObservationInput = {
  agentConnectionId?: string;
  content: string;
  sourceAgent?: AgentKind;
  sourceLabel?: string;
  sourceSession?: string;
  status?: ObservationStatus;
  title: string;
};

export type ImportProjectSnapshotInput = {
  mode?: "merge" | "new";
  snapshot: ProjectExportPayload;
  targetSlug?: string;
};

export type ProjectExportPayload = {
  auditEvents: Array<{
    action: string;
    createdAt: string;
    detailJson: string | null;
    targetId: string | null;
    targetType: string | null;
  }>;
  commitLogs: Array<{
    branch: string;
    commitSha: string | null;
    createdAt: string;
    errorMessage: string | null;
    filesJson: string | null;
    message: string;
    pullRequestUrl: string | null;
    status: string;
  }>;
  documents: Array<{
    checksum: string | null;
    content: string;
    createdAt: string;
    kind: string;
    lastIndexedAt: string | null;
    path: string | null;
    title: string;
    updatedAt: string;
  }>;
  exportedAt: string;
  notebook: {
    content: string;
    createdAt: string;
    title: string;
    updatedAt: string;
  } | null;
  observations: Array<{
    agentConnectionId: string | null;
    content: string;
    createdAt: string;
    sourceAgent: AgentKind | null;
    sourceLabel: string | null;
    sourceSession: string | null;
    status: ObservationStatus;
    title: string;
    updatedAt: string;
  }>;
  project: {
    architecturePath: string | null;
    contextPath: string | null;
    defaultBranch: string;
    description: string | null;
    directCommitEnabled: boolean;
    name: string;
    repoLocalPath: string | null;
    repoUrl: string | null;
    slug: string;
    status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PAUSED";
  };
  resumePoints: Array<{
    branch: string | null;
    content: string;
    createdAt: string;
    documentIdsJson: string | null;
    hash: string;
    sourceSession: string | null;
    summaryIdsJson: string | null;
    title: string;
    updatedAt: string;
  }>;
  summaries: Array<{
    content: string;
    createdAt: string;
    isPinned: boolean;
    kind: string;
    sourceSession: string | null;
    title: string;
    updatedAt: string;
  }>;
  version: 1;
};

type AccessibleProject = Awaited<ReturnType<typeof getAccessibleProject>>;

async function getAccessibleProject(projectSlug: string, actorId: string) {
  return prisma.project.findFirst({
    where: {
      slug: projectSlug,
      ...(buildProjectAccessWhere(actorId) ?? {}),
    },
  });
}

function ensureProject(project: AccessibleProject): asserts project is NonNullable<AccessibleProject> {
  if (!project) {
    throw new Error("Project not found.");
  }
}

export async function listProjectObservations(
  slug: string,
  actorId: string,
  options?: {
    limit?: number;
    status?: "all" | ObservationStatus;
  },
) {
  const project = await getAccessibleProject(slug, actorId);
  ensureProject(project);

  const observations = await prisma.projectObservation.findMany({
    where: {
      projectId: project.id,
      ...(options?.status && options.status !== "all" ? { status: options.status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      author: true,
    },
    take: Math.max(1, Math.min(options?.limit ?? 50, 200)),
  });

  return observations.map((observation) => ({
    id: observation.id,
    title: observation.title,
    content: observation.content,
    status: observation.status,
    sourceAgent: observation.sourceAgent,
    sourceLabel: observation.sourceLabel,
    sourceSession: observation.sourceSession,
    agentConnectionId: observation.agentConnectionId,
    createdAt: observation.createdAt.toISOString(),
    updatedAt: observation.updatedAt.toISOString(),
    author: observation.author
      ? {
          id: observation.author.id,
          name: observation.author.name,
          email: observation.author.email,
        }
      : null,
  }));
}

export async function createProjectObservation(
  slug: string,
  input: CreateProjectObservationInput,
  actor: ActivityActor,
) {
  const project = await getAccessibleProject(slug, actor.userId);
  ensureProject(project);

  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) {
    throw new Error("Observation title is required.");
  }

  if (!content) {
    throw new Error("Observation content is required.");
  }

  const observation = await prisma.projectObservation.create({
    data: {
      projectId: project.id,
      authorId: actor.userId,
      title,
      content,
      status: input.status ?? "DRAFT",
      sourceAgent: input.sourceAgent ?? null,
      sourceLabel: input.sourceLabel?.trim() || null,
      sourceSession: input.sourceSession?.trim() || null,
      agentConnectionId: input.agentConnectionId?.trim() || null,
    },
    include: {
      author: true,
    },
  });

  await prisma.auditEvent.create({
    data: {
      userId: actor.userId,
      projectId: project.id,
      deviceId: actor.cliDeviceId,
      cliSessionId: actor.cliSessionId,
      action: "project.observation.created",
      targetType: "project_observation",
      targetId: observation.id,
      detailJson: JSON.stringify({
        sourceAgent: observation.sourceAgent,
        sourceLabel: observation.sourceLabel,
        status: observation.status,
        title: observation.title,
      }),
    },
  });

  return {
    id: observation.id,
    title: observation.title,
    content: observation.content,
    status: observation.status,
    sourceAgent: observation.sourceAgent,
    sourceLabel: observation.sourceLabel,
    sourceSession: observation.sourceSession,
    agentConnectionId: observation.agentConnectionId,
    createdAt: observation.createdAt.toISOString(),
    updatedAt: observation.updatedAt.toISOString(),
    author: observation.author
      ? {
          id: observation.author.id,
          name: observation.author.name,
          email: observation.author.email,
        }
      : null,
  };
}

export async function promoteProjectObservation(slug: string, observationId: string, actor: ActivityActor) {
  const project = await getAccessibleProject(slug, actor.userId);
  ensureProject(project);

  const observation = await prisma.projectObservation.findFirst({
    where: {
      id: observationId,
      projectId: project.id,
    },
  });

  if (!observation) {
    throw new Error("Observation not found.");
  }

  const notebook = await prisma.projectNotebook.findUnique({
    where: {
      projectId: project.id,
    },
  });
  const notebookTitle = notebook?.title || `${project.name} notebook`;
  const notebookContent = notebook?.content?.trim() || "";
  const promotedBlock = `## Observation: ${observation.title}\n\n${observation.content}`;

  await upsertProjectNotebook(
    slug,
    {
      title: notebookTitle,
      content: notebookContent ? `${notebookContent}\n\n${promotedBlock}` : promotedBlock,
      agentConnectionId: observation.agentConnectionId ?? undefined,
      agentLabel: observation.sourceLabel ?? undefined,
    },
    actor,
  );

  const updated = await prisma.projectObservation.update({
    where: { id: observation.id },
    data: {
      status: "PROMOTED",
    },
    include: {
      author: true,
    },
  });

  await prisma.auditEvent.create({
    data: {
      userId: actor.userId,
      projectId: project.id,
      deviceId: actor.cliDeviceId,
      cliSessionId: actor.cliSessionId,
      action: "project.observation.promoted",
      targetType: "project_observation",
      targetId: updated.id,
      detailJson: JSON.stringify({
        sourceLabel: updated.sourceLabel,
        title: updated.title,
      }),
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    status: updated.status,
    sourceAgent: updated.sourceAgent,
    sourceLabel: updated.sourceLabel,
    sourceSession: updated.sourceSession,
    agentConnectionId: updated.agentConnectionId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    author: updated.author
      ? {
          id: updated.author.id,
          name: updated.author.name,
          email: updated.author.email,
        }
      : null,
  };
}

export async function exportProjectSnapshot(slug: string, actorId: string): Promise<ProjectExportPayload | null> {
  const project = await prisma.project.findFirst({
    where: {
      slug,
      ...(buildProjectAccessWhere(actorId) ?? {}),
    },
    include: {
      notebook: true,
      summaries: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
      resumePoints: { orderBy: { createdAt: "asc" } },
      observations: { orderBy: { createdAt: "asc" } },
      commitLogs: { orderBy: { createdAt: "asc" } },
      auditEvents: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) {
    return null;
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    project: {
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
    },
    notebook: project.notebook
      ? {
          title: project.notebook.title,
          content: project.notebook.content,
          createdAt: project.notebook.createdAt.toISOString(),
          updatedAt: project.notebook.updatedAt.toISOString(),
        }
      : null,
    summaries: project.summaries.map((summary) => ({
      title: summary.title,
      kind: summary.kind,
      content: summary.content,
      sourceSession: summary.sourceSession,
      isPinned: summary.isPinned,
      createdAt: summary.createdAt.toISOString(),
      updatedAt: summary.updatedAt.toISOString(),
    })),
    documents: project.documents.map((document) => ({
      title: document.title,
      kind: document.kind,
      path: document.path,
      content: document.content,
      checksum: document.checksum,
      lastIndexedAt: document.lastIndexedAt?.toISOString() ?? null,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    })),
    resumePoints: project.resumePoints.map((resumePoint) => ({
      hash: resumePoint.hash,
      title: resumePoint.title,
      content: resumePoint.content,
      branch: resumePoint.branch,
      summaryIdsJson: resumePoint.summaryIdsJson,
      documentIdsJson: resumePoint.documentIdsJson,
      sourceSession: resumePoint.sourceSession,
      createdAt: resumePoint.createdAt.toISOString(),
      updatedAt: resumePoint.updatedAt.toISOString(),
    })),
    observations: project.observations.map((observation) => ({
      title: observation.title,
      content: observation.content,
      status: observation.status,
      sourceAgent: observation.sourceAgent,
      sourceLabel: observation.sourceLabel,
      sourceSession: observation.sourceSession,
      agentConnectionId: observation.agentConnectionId,
      createdAt: observation.createdAt.toISOString(),
      updatedAt: observation.updatedAt.toISOString(),
    })),
    commitLogs: project.commitLogs.map((commit) => ({
      branch: commit.branch,
      message: commit.message,
      status: commit.status,
      filesJson: commit.filesJson,
      commitSha: commit.commitSha,
      pullRequestUrl: commit.pullRequestUrl,
      errorMessage: commit.errorMessage,
      createdAt: commit.createdAt.toISOString(),
    })),
    auditEvents: project.auditEvents.map((event) => ({
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      detailJson: event.detailJson,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function importProjectSnapshot(actorId: string, input: ImportProjectSnapshotInput) {
  const mode = input.mode ?? "new";
  const snapshot = input.snapshot;
  let targetProject = input.targetSlug ? await getAccessibleProject(input.targetSlug, actorId) : null;

  if (!targetProject && mode === "merge") {
    targetProject = await getAccessibleProject(snapshot.project.slug, actorId);
  }

  if (!targetProject) {
    targetProject = await createProject(
      {
        name: snapshot.project.name,
        slug: input.targetSlug ?? snapshot.project.slug,
        description: snapshot.project.description ?? undefined,
        repoUrl: snapshot.project.repoUrl ?? undefined,
        repoLocalPath: snapshot.project.repoLocalPath ?? undefined,
        defaultBranch: snapshot.project.defaultBranch,
        directCommitEnabled: snapshot.project.directCommitEnabled,
        contextPath: snapshot.project.contextPath ?? undefined,
        architecturePath: snapshot.project.architecturePath ?? undefined,
      },
      actorId,
    );

    await prisma.projectSummary.deleteMany({
      where: {
        projectId: targetProject.id,
        title: "Project created",
      },
    });
  }

  await updateProject(
    targetProject.slug,
    {
      name: snapshot.project.name,
      description: snapshot.project.description ?? undefined,
      repoUrl: snapshot.project.repoUrl ?? undefined,
      repoLocalPath: snapshot.project.repoLocalPath ?? undefined,
      defaultBranch: snapshot.project.defaultBranch,
      directCommitEnabled: snapshot.project.directCommitEnabled,
      contextPath: snapshot.project.contextPath ?? undefined,
      architecturePath: snapshot.project.architecturePath ?? undefined,
      status: snapshot.project.status,
    },
    actorId,
  );

  const activityActor: ActivityActor = { userId: actorId };

  if (snapshot.notebook) {
    await upsertProjectNotebook(
      targetProject.slug,
      {
        title: snapshot.notebook.title,
        content: snapshot.notebook.content,
      },
      activityActor,
    );
  }

  await prisma.$transaction(async (tx) => {
    if (snapshot.summaries.length) {
      await tx.projectSummary.createMany({
        data: snapshot.summaries.map((summary) => ({
          projectId: targetProject.id,
          authorId: actorId,
          title: summary.title,
          kind: summary.kind as SummaryKind,
          content: summary.content,
          sourceSession: summary.sourceSession,
          isPinned: summary.isPinned,
          createdAt: new Date(summary.createdAt),
          updatedAt: new Date(summary.updatedAt),
        })),
      });
    }

    if (snapshot.documents.length) {
      await tx.architectureDocument.createMany({
        data: snapshot.documents.map((document) => ({
          projectId: targetProject.id,
          authorId: actorId,
          title: document.title,
          kind: document.kind as DocumentKind,
          path: document.path,
          content: document.content,
          checksum: document.checksum,
          lastIndexedAt: document.lastIndexedAt ? new Date(document.lastIndexedAt) : null,
          createdAt: new Date(document.createdAt),
          updatedAt: new Date(document.updatedAt),
        })),
      });
    }

    if (snapshot.resumePoints.length) {
      await tx.resumePoint.createMany({
        data: snapshot.resumePoints.map((resumePoint) => ({
          projectId: targetProject.id,
          authorId: actorId,
          hash: `${resumePoint.hash}-${Math.random().toString(36).slice(2, 6)}`,
          title: resumePoint.title,
          content: resumePoint.content,
          branch: resumePoint.branch,
          summaryIdsJson: resumePoint.summaryIdsJson,
          documentIdsJson: resumePoint.documentIdsJson,
          sourceSession: resumePoint.sourceSession,
          createdAt: new Date(resumePoint.createdAt),
          updatedAt: new Date(resumePoint.updatedAt),
        })),
      });
    }

    if (snapshot.observations.length) {
      await tx.projectObservation.createMany({
        data: snapshot.observations.map((observation) => ({
          projectId: targetProject.id,
          authorId: actorId,
          title: observation.title,
          content: observation.content,
          status: observation.status,
          sourceAgent: observation.sourceAgent,
          sourceLabel: observation.sourceLabel,
          sourceSession: observation.sourceSession,
          agentConnectionId: observation.agentConnectionId,
          createdAt: new Date(observation.createdAt),
          updatedAt: new Date(observation.updatedAt),
        })),
      });
    }

    if (snapshot.commitLogs.length) {
      await tx.commitLog.createMany({
        data: snapshot.commitLogs.map((commit) => ({
          projectId: targetProject.id,
          actorId,
          branch: commit.branch,
          message: commit.message,
          status: commit.status as CommitStatus,
          filesJson: commit.filesJson,
          commitSha: commit.commitSha,
          pullRequestUrl: commit.pullRequestUrl,
          errorMessage: commit.errorMessage,
          createdAt: new Date(commit.createdAt),
          updatedAt: new Date(commit.createdAt),
        })),
      });
    }

    if (snapshot.auditEvents.length) {
      await tx.auditEvent.createMany({
        data: snapshot.auditEvents.map((event) => ({
          userId: actorId,
          projectId: targetProject.id,
          action: event.action,
          targetType: event.targetType,
          targetId: event.targetId,
          detailJson: event.detailJson,
          createdAt: new Date(event.createdAt),
        })),
      });
    }
  });

  await prisma.auditEvent.create({
    data: {
      userId: actorId,
      projectId: targetProject.id,
      action: "project.imported",
      targetType: "project",
      targetId: targetProject.id,
      detailJson: JSON.stringify({
        mode,
        sourceSlug: snapshot.project.slug,
      }),
    },
  });

  return {
    project: {
      id: targetProject.id,
      name: targetProject.name,
      slug: targetProject.slug,
    },
    counts: {
      summaries: snapshot.summaries.length,
      documents: snapshot.documents.length,
      resumePoints: snapshot.resumePoints.length,
      observations: snapshot.observations.length,
      commitLogs: snapshot.commitLogs.length,
      auditEvents: snapshot.auditEvents.length,
    },
  };
}
