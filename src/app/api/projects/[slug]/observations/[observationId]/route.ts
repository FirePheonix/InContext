import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { promoteProjectObservation } from "@/lib/project-memory";

export async function PATCH(request: Request, context: { params: Promise<{ observationId: string; slug: string }> }) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  try {
    const { slug, observationId } = await context.params;
    const input = await request.json();

    if (input?.action !== "promote") {
      return NextResponse.json({ error: "Unsupported observation action." }, { status: 400 });
    }

    const observation = await promoteProjectObservation(slug, observationId, actor);

    return NextResponse.json({ observation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update observation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
