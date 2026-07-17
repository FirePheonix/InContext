import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { createProjectObservation, listProjectObservations } from "@/lib/project-memory";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || "50");
  const rawStatus = searchParams.get("status");
  const status = rawStatus === "DRAFT" || rawStatus === "PROMOTED" || rawStatus === "all" ? rawStatus : undefined;

  try {
    const observations = await listProjectObservations(slug, actor.userId, { limit, status });
    return NextResponse.json({ observations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list observations.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  try {
    const { slug } = await context.params;
    const input = await request.json();
    const observation = await createProjectObservation(slug, input, actor);

    return NextResponse.json({ observation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create observation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
