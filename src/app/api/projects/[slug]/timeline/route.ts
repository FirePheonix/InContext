import { NextResponse } from "next/server";

import { getApiSessionUserId, unauthorizedJson } from "@/lib/api-auth";
import { getProjectActivityTimeline } from "@/lib/project-service";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const userId = await getApiSessionUserId(request);

  if (!userId) {
    return unauthorizedJson();
  }

  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || "30");
  const items = await getProjectActivityTimeline(slug, userId, { limit });

  if (!items) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ items });
}
