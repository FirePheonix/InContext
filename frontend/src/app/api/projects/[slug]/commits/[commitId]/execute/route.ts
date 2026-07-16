import { NextResponse } from "next/server";

import { getApiSessionUserId, unauthorizedJson } from "@/lib/api-auth";
import { executeCommitIntent } from "@/lib/git-bridge";

export async function POST(_: Request, context: { params: Promise<{ slug: string; commitId: string }> }) {
  const userId = await getApiSessionUserId();

  if (!userId) {
    return unauthorizedJson();
  }

  try {
    const { slug, commitId } = await context.params;
    const commit = await executeCommitIntent(slug, commitId, userId);

    return NextResponse.json({ commit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to execute commit intent.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
