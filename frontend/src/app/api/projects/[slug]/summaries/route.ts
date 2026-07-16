import { NextResponse } from "next/server";

import { createProjectSummary } from "@/lib/project-service";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const input = await request.json();
    const summary = await createProjectSummary(slug, input);

    return NextResponse.json({ summary }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project summary.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
