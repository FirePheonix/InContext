import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { createProjectAgentConnection } from "@/lib/project-service";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  try {
    const { slug } = await context.params;
    const input = await request.json();
    const agent = await createProjectAgentConnection(slug, input, actor);

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project agent.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
