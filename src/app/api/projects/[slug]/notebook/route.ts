import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { upsertProjectNotebook } from "@/lib/project-service";

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  try {
    const { slug } = await context.params;
    const input = await request.json();
    const notebook = await upsertProjectNotebook(slug, input, actor);

    return NextResponse.json({ notebook });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project notebook.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
