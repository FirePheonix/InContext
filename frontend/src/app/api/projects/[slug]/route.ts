import { NextResponse } from "next/server";

import { getProjectDetail } from "@/lib/project-service";

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const project = await getProjectDetail(slug);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
