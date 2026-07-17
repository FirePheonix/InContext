import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { getProjectWorkspace } from "@/lib/project-service";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  const { slug } = await context.params;
  const workspace = await getProjectWorkspace(slug, actor.userId);

  if (!workspace) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json(workspace);
}
