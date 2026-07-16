import { prisma } from "@/lib/prisma";
import { buildProjectAccessWhere } from "@/lib/project-access";

import { randomBytes } from "node:crypto";

type LinkProjectInput = {
  branch?: string;
  deviceId?: string | null;
  repoRemoteUrl?: string | null;
  repoRoot: string;
};

type CreateResumePointInput = {
  branch?: string;
  content: string;
  documentIds?: string[];
  sourceSession?: string;
  summaryIds?: string[];
  title: string;
};

function createResumeHash() {
  return randomBytes(5).toString("hex");
}

async function getAccessibleProject(projectSlug: string, actorId: string) {
  return prisma.project.findFirst({
    where: {
      slug: projectSlug,
      ...(buildProjectAccessWhere(actorId) ?? {}),
    },
  });
}

export async function linkProjectRepo(projectSlug: string, actorId: string, input: LinkProjectInput) {
  const project = await getAccessibleProject(projectSlug, actorId);

  if (!project) {
    throw new Error("Project not found.");
  }

  const repoRoot = input.repoRoot.trim();

  if (!repoRoot) {
    throw new Error("Repository root is required.");
  }

  await prisma.projectLink.updateMany({
    where: {
      userId: actorId,
      ...(input.deviceId ? { deviceId: input.deviceId } : {}),
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  const link = await prisma.projectLink.upsert({
    where: {
      userId_repoRoot: {
        userId: actorId,
        repoRoot,
      },
    },
    update: {
      projectId: project.id,
      deviceId: input.deviceId?.trim() || null,
      repoRemoteUrl: input.repoRemoteUrl?.trim() || null,
      branch: input.branch?.trim() || null,
      isActive: true,
    },
    create: {
      projectId: project.id,
      userId: actorId,
      deviceId: input.deviceId?.trim() || null,
      repoRoot,
      repoRemoteUrl: input.repoRemoteUrl?.trim() || null,
      branch: input.branch?.trim() || null,
      isActive: true,
    },
    include: {
      project: true,
      device: true,
    },
  });

  await prisma.auditEvent.create({
    data: {
      userId: actorId,
      projectId: project.id,
      deviceId: link.deviceId,
      action: "project.linked",
      targetType: "project_link",
      targetId: link.id,
      detailJson: JSON.stringify({
        branch: link.branch,
        repoRemoteUrl: link.repoRemoteUrl,
        repoRoot: link.repoRoot,
      }),
    },
  });

  return {
    id: link.id,
    branch: link.branch,
    projectSlug: link.project.slug,
    projectName: link.project.name,
    repoRemoteUrl: link.repoRemoteUrl,
    repoRoot: link.repoRoot,
    updatedAt: link.updatedAt.toISOString(),
  };
}

export async function getProjectLinks(actorId: string) {
  const links = await prisma.projectLink.findMany({
    where: {
      userId: actorId,
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: {
      project: true,
      device: true,
    },
  });

  return links.map((link) => ({
    id: link.id,
    branch: link.branch,
    deviceLabel: link.device?.label ?? null,
    isActive: link.isActive,
    projectName: link.project.name,
    projectSlug: link.project.slug,
    repoRemoteUrl: link.repoRemoteUrl,
    repoRoot: link.repoRoot,
    updatedAt: link.updatedAt.toISOString(),
  }));
}

export async function createResumePoint(projectSlug: string, actorId: string, input: CreateResumePointInput) {
  const project = await getAccessibleProject(projectSlug, actorId);

  if (!project) {
    throw new Error("Project not found.");
  }

  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) {
    throw new Error("Resume title is required.");
  }

  if (!content) {
    throw new Error("Resume content is required.");
  }

  let hash = createResumeHash();

  while (await prisma.resumePoint.findUnique({ where: { hash } })) {
    hash = createResumeHash();
  }

  const summary = await prisma.projectSummary.create({
    data: {
      projectId: project.id,
      authorId: actorId,
      title,
      kind: "HANDOFF",
      content,
      sourceSession: input.sourceSession?.trim() || null,
      isPinned: true,
    },
  });

  const resumePoint = await prisma.resumePoint.create({
    data: {
      projectId: project.id,
      authorId: actorId,
      hash,
      title,
      content,
      branch: input.branch?.trim() || null,
      summaryIdsJson: JSON.stringify([summary.id, ...(input.summaryIds ?? [])]),
      documentIdsJson: JSON.stringify(input.documentIds ?? []),
      sourceSession: input.sourceSession?.trim() || null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      userId: actorId,
      projectId: project.id,
      action: "resume_point.created",
      targetType: "resume_point",
      targetId: resumePoint.id,
      detailJson: JSON.stringify({
        branch: resumePoint.branch,
        hash: resumePoint.hash,
        title: resumePoint.title,
      }),
    },
  });

  return {
    id: resumePoint.id,
    hash: resumePoint.hash,
    title: resumePoint.title,
    content: resumePoint.content,
    branch: resumePoint.branch,
    projectSlug: project.slug,
    projectName: project.name,
    createdAt: resumePoint.createdAt.toISOString(),
  };
}

export async function getResumePoint(hash: string, actorId: string) {
  const resumePoint = await prisma.resumePoint.findFirst({
    where: {
      hash,
      project: buildProjectAccessWhere(actorId),
    },
    include: {
      project: true,
      author: true,
    },
  });

  if (!resumePoint) {
    return null;
  }

  const summaries = resumePoint.summaryIdsJson ? (JSON.parse(resumePoint.summaryIdsJson) as string[]) : [];
  const documents = resumePoint.documentIdsJson ? (JSON.parse(resumePoint.documentIdsJson) as string[]) : [];

  return {
    id: resumePoint.id,
    hash: resumePoint.hash,
    title: resumePoint.title,
    content: resumePoint.content,
    branch: resumePoint.branch,
    sourceSession: resumePoint.sourceSession,
    createdAt: resumePoint.createdAt.toISOString(),
    updatedAt: resumePoint.updatedAt.toISOString(),
    project: {
      id: resumePoint.project.id,
      name: resumePoint.project.name,
      slug: resumePoint.project.slug,
      status: resumePoint.project.status,
      defaultBranch: resumePoint.project.defaultBranch,
      repoUrl: resumePoint.project.repoUrl,
    },
    author: {
      id: resumePoint.author.id,
      name: resumePoint.author.name,
      email: resumePoint.author.email,
    },
    summaryIds: summaries,
    documentIds: documents,
  };
}

export async function listResumePoints(actorId: string, projectSlug?: string) {
  const points = await prisma.resumePoint.findMany({
    where: {
      ...(projectSlug
        ? {
            project: {
              slug: projectSlug,
              ...(buildProjectAccessWhere(actorId) ?? {}),
            },
          }
        : {
            project: buildProjectAccessWhere(actorId),
          }),
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      project: true,
      author: true,
    },
    take: 50,
  });

  return points.map((point) => ({
    id: point.id,
    hash: point.hash,
    title: point.title,
    branch: point.branch,
    createdAt: point.createdAt.toISOString(),
    project: {
      name: point.project.name,
      slug: point.project.slug,
    },
    author: {
      name: point.author.name,
      email: point.author.email,
    },
  }));
}
