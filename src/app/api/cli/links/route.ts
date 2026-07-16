import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { getProjectLinks, linkProjectRepo } from "@/lib/project-workflow";

export async function GET(request: Request) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  const links = await getProjectLinks(actor.userId);

  return NextResponse.json({ links });
}

export async function POST(request: Request) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  try {
    const input = await request.json();
    const projectSlug = typeof input.projectSlug === "string" ? input.projectSlug : "";
    const link = await linkProjectRepo(projectSlug, actor.userId, {
      repoRoot: input.repoRoot,
      repoRemoteUrl: input.repoRemoteUrl,
      branch: input.branch,
      deviceId: actor.cliDeviceId ?? null,
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to link project.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
