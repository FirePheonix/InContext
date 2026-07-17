import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { exportProjectSnapshot } from "@/lib/project-memory";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  const { slug } = await context.params;
  const snapshot = await exportProjectSnapshot(slug, actor.userId);

  if (!snapshot) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ snapshot });
}
