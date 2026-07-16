import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function buildProjectAccessWhere(actorId?: string): Prisma.ProjectWhereInput | undefined {
  if (!actorId) {
    return undefined;
  }

  return {
    OR: [
      { createdById: actorId },
      {
        memberships: {
          some: {
            userId: actorId,
          },
        },
      },
    ],
  };
}

export async function ensureWorkspaceAccessForUser(actorId: string) {
  const accessCount = await prisma.project.count({
    where: buildProjectAccessWhere(actorId),
  });

  if (accessCount > 0) {
    return;
  }

  const projects = await prisma.project.findMany({
    select: { id: true },
  });

  for (const project of projects) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: actorId,
        },
      },
      update: { role: "ADMIN" },
      create: {
        projectId: project.id,
        userId: actorId,
        role: "ADMIN",
      },
    });
  }
}
