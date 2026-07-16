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

  return NextResponse.json({ project });
}
