import { NextResponse } from "next/server";

import { getApiSessionUserId, unauthorizedJson } from "@/lib/api-auth";
import { getProjectDetail } from "@/lib/project-service";

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const userId = await getApiSessionUserId();

  if (!userId) {
    return unauthorizedJson();
  }

  const { slug } = await context.params;
  const project = await getProjectDetail(slug, userId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status,
      repoUrl: project.repoUrl,
      defaultBranch: project.defaultBranch,
      contextPath: project.contextPath,
      architecturePath: project.architecturePath,
      updatedAt: project.updatedAt,
    },
    context: {
      summaries: project.summaries,
      documents: project.documents,
      agents: project.agents,
      commits: project.commits,
      tokens: project.tokens,
    },
  });
}
