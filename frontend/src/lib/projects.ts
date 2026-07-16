import { formatDistanceToNow } from "date-fns";

import { prisma } from "@/lib/prisma";

import type { ProjectRow } from "@/app/(main)/dashboard/users/_components/data";

async function ensureBootstrapData() {
  const projectCount = await prisma.project.count();

  if (projectCount > 0) {
    return;
  }

  const owner = await prisma.user.upsert({
    where: { email: "owner@contexthub.local" },
    update: {},
    create: {
      email: "owner@contexthub.local",
      name: "Context Hub Owner",
    },
  });

  await prisma.project.createMany({
    data: [
      {
        name: "frontend-dashboard",
        slug: "frontend-dashboard",
        description: "Shared memory UI for project summaries, handoffs, and architecture context.",
        status: "ACTIVE",
        repoUrl: "github.com/org/frontend-dashboard",
        defaultBranch: "main",
        contextPath: "memory/frontend-dashboard",
        architecturePath: "docs/architecture",
        createdById: owner.id,
      },
      {
        name: "reference-mcp",
        slug: "reference-mcp",
        description: "Cross-agent MCP server for project boundaries, recall, and source adapters.",
        status: "DRAFT",
        repoUrl: "github.com/org/reference-mcp",
        defaultBranch: "main",
        contextPath: "memory/reference-mcp",
        architecturePath: "architecture/reference-mcp",
        createdById: owner.id,
      },
      {
        name: "vedaai-backend",
        slug: "vedaai-backend",
        description: "Repo-linked backend with architecture sync and write-token review requirements.",
        status: "PAUSED",
        repoUrl: "github.com/org/vedaai-backend",
        defaultBranch: "develop",
        contextPath: "memory/vedaai-backend",
        architecturePath: "docs/backend",
        createdById: owner.id,
      },
    ],
  });
}

export async function getProjectRows(): Promise<ProjectRow[]> {
  await ensureBootstrapData();

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
