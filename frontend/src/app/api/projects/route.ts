import { NextResponse } from "next/server";

import { createProject, getProjectRegistry } from "@/lib/project-service";

export async function GET() {
  const projects = await getProjectRegistry();

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const project = await createProject(input);

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
