import { formatDistanceToNow } from "date-fns";

import { ensureProjectBootstrapData } from "@/lib/project-bootstrap";
import { prisma } from "@/lib/prisma";

import type { ProjectRow } from "@/app/(main)/dashboard/users/_components/data";

export async function getProjectRows(): Promise<ProjectRow[]> {
  await ensureProjectBootstrapData();

  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: true,
      _count: {
        select: {
          accessTokens: true,
          documents: true,
          memberships: true,
          summaries: true,
        },
      },
    },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description ?? "No project summary yet.",
    status: project.status,
    repoHost: project.repoUrl ? project.repoUrl.replace(/^https?:\/\//, "") : "Repo not connected",
    branch: project.defaultBranch,
    owner: project.createdBy.name ?? project.createdBy.email ?? "Unknown owner",
    members: project._count.memberships,
    summaries: project._count.summaries,
    documents: project._count.documents,
    tokens: project._count.accessTokens,
    updatedAt: project.updatedAt.toISOString(),
    updatedLabel: `${formatDistanceToNow(project.updatedAt, { addSuffix: true })}`,
  }));
}
