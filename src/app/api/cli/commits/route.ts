import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { recordProjectCommit } from "@/lib/project-service";

export async function POST(request: Request) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  try {
    const input = await request.json();
    const projectSlug = typeof input.projectSlug === "string" ? input.projectSlug : "";
    const commit = await recordProjectCommit(
      projectSlug,
      {
        message: input.message,
        branch: input.branch,
        files: input.files,
        status: input.status,
        commitSha: input.commitSha,
        pullRequestUrl: input.pullRequestUrl,
        errorMessage: input.errorMessage,
      },
      actor.userId,
    );

    return NextResponse.json({ commit }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record commit.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
