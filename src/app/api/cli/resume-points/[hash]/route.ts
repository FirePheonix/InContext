import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { getProjectDetail } from "@/lib/project-service";
import { getResumePoint } from "@/lib/project-workflow";

export async function GET(request: Request, context: { params: Promise<{ hash: string }> }) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  const { hash } = await context.params;
  const resumePoint = await getResumePoint(hash, actor.userId);

  if (!resumePoint) {
    return NextResponse.json({ error: "Resume point not found." }, { status: 404 });
  }

  const project = await getProjectDetail(resumePoint.project.slug, actor.userId);

  return NextResponse.json({
    resumePoint,
    project,
  });
}
