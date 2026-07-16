import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { createResumePoint, listResumePoints } from "@/lib/project-workflow";

export async function GET(request: Request) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("project");
  const points = await listResumePoints(actor.userId, projectSlug ?? undefined);

  return NextResponse.json({ resumePoints: points });
}

export async function POST(request: Request) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  try {
    const input = await request.json();
    const projectSlug = typeof input.projectSlug === "string" ? input.projectSlug : "";
    const resumePoint = await createResumePoint(projectSlug, actor.userId, {
      title: input.title,
      content: input.content,
      branch: input.branch,
      summaryIds: input.summaryIds,
      documentIds: input.documentIds,
      sourceSession: input.sourceSession,
    });

    return NextResponse.json({ resumePoint }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create resume point.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
