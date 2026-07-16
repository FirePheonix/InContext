import { NextResponse } from "next/server";

import { getApiSessionUserId, unauthorizedJson } from "@/lib/api-auth";
import { createProject, getProjectRegistry } from "@/lib/project-service";

export async function GET() {
  const userId = await getApiSessionUserId();

  if (!userId) {
    return unauthorizedJson();
  }

  const projects = await getProjectRegistry();

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const userId = await getApiSessionUserId();

  if (!userId) {
    return unauthorizedJson();
  }

  try {
    const input = await request.json();
    const project = await createProject(input, userId);

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
