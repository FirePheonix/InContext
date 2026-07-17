import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { importProjectSnapshot } from "@/lib/project-memory";

export async function POST(request: Request) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  try {
    const input = await request.json();
    const result = await importProjectSnapshot(actor.userId, input);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import project snapshot.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
