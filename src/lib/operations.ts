import { differenceInHours } from "date-fns";

import { prisma } from "@/lib/prisma";

function getNotebookState(updatedAt: Date | null | undefined) {
  if (!updatedAt) {
    return "missing";
  }

  const ageHours = differenceInHours(new Date(), updatedAt);

  if (ageHours <= 24) {
    return "fresh";
  }

  if (ageHours <= 72) {
    return "watch";
  }

  return "stale";
}

export async function getOperationsDashboardData(userId: string) {
  const [devices, links, projects, observations, resumePoints] = await Promise.all([
    prisma.cliDevice.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
    }),
    prisma.projectLink.findMany({
      where: {
        userId,
      },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      include: {
        project: {
          include: {
            notebook: true,
          },
        },
      },
      take: 12,
    }),
    prisma.project.findMany({
      where: {
        OR: [{ createdById: userId }, { memberships: { some: { userId } } }],
      },
      include: {
        notebook: true,
        agentConnections: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 3,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 12,
    }),
    prisma.projectObservation.findMany({
      where: {
        project: {
          OR: [{ createdById: userId }, { memberships: { some: { userId } } }],
        },
      },
      include: {
        project: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 12,
    }),
    prisma.resumePoint.findMany({
      where: {
        project: {
          OR: [{ createdById: userId }, { memberships: { some: { userId } } }],
        },
      },
      include: {
        project: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
  ]);

  return {
    summary: {
      activeDevices: devices.length,
      linkedRepos: links.length,
      liveAgentBridges: projects.filter((project) =>
        project.agentConnections.some((connection) => connection.lastSyncedAt),
      ).length,
      staleNotebooks: projects.filter((project) => getNotebookState(project.notebook?.updatedAt) === "stale").length,
    },
    devices: devices.map((device) => ({
      id: device.id,
      label: device.label,
      hostname: device.hostname,
      platform: device.platform,
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
      updatedAt: device.updatedAt.toISOString(),
    })),
    links: links.map((link) => ({
      id: link.id,
      projectName: link.project.name,
      projectSlug: link.project.slug,
      repoRoot: link.repoRoot,
      repoRemoteUrl: link.repoRemoteUrl,
      branch: link.branch,
      isActive: link.isActive,
      notebookState: getNotebookState(link.project.notebook?.updatedAt),
      notebookUpdatedAt: link.project.notebook?.updatedAt.toISOString() ?? null,
      updatedAt: link.updatedAt.toISOString(),
    })),
    bridges: projects.map((project) => ({
      projectId: project.id,
      projectName: project.name,
      projectSlug: project.slug,
      notebookState: getNotebookState(project.notebook?.updatedAt),
      notebookUpdatedAt: project.notebook?.updatedAt.toISOString() ?? null,
      recentAgents: project.agentConnections.map((connection) => ({
        id: connection.id,
        label: connection.label,
        agent: connection.agent,
        lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
        updatedAt: connection.updatedAt.toISOString(),
      })),
    })),
    observations: observations.map((observation) => ({
      id: observation.id,
      title: observation.title,
      status: observation.status,
      sourceAgent: observation.sourceAgent,
      sourceLabel: observation.sourceLabel,
      projectName: observation.project.name,
      projectSlug: observation.project.slug,
      updatedAt: observation.updatedAt.toISOString(),
    })),
    resumePoints: resumePoints.map((resumePoint) => ({
      id: resumePoint.id,
      hash: resumePoint.hash,
      title: resumePoint.title,
      branch: resumePoint.branch,
      projectName: resumePoint.project.name,
      projectSlug: resumePoint.project.slug,
      createdAt: resumePoint.createdAt.toISOString(),
    })),
  };
}
