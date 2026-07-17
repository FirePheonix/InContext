import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { updateProjectAgentConnection } from "@/lib/project-service";

export async function PATCH(request: Request, context: { params: Promise<{ slug: string; agentId: string }> }) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  try {
    const { slug, agentId } = await context.params;
    const input = await request.json();
    const agent = await updateProjectAgentConnection(slug, agentId, input, actor);

    return NextResponse.json({ agent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project agent.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
