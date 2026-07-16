import { NextResponse } from "next/server";

import { getApiSessionUserId, unauthorizedJson } from "@/lib/api-auth";
import { createCommitIntent } from "@/lib/project-service";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const userId = await getApiSessionUserId(request);

  if (!userId) {
    return unauthorizedJson();
  }

  try {
    const { slug } = await context.params;
    const input = await request.json();
    const commit = await createCommitIntent(slug, input, userId);

    return NextResponse.json({ commit }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to queue commit intent.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
