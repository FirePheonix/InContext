import { NextResponse } from "next/server";

import { getApiSessionUserId, unauthorizedJson } from "@/lib/api-auth";
import { type ProjectContextEntryType, searchProjectMemory } from "@/lib/project-service";

function parseTypes(value: string | null): ProjectContextEntryType[] | undefined {
  if (!value) {
    return undefined;
  }

  const supported = new Set<ProjectContextEntryType>([
    "ACTIVITY",
    "COMMIT",
    "DOCUMENT",
    "NOTEBOOK",
    "RESUME_POINT",
    "SUMMARY",
  ]);

  const parsed = value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is ProjectContextEntryType => supported.has(item as ProjectContextEntryType));

  return parsed.length ? parsed : undefined;
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const userId = await getApiSessionUserId(request);

  if (!userId) {
    return unauthorizedJson();
  }

  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") || "12");
  const types = parseTypes(searchParams.get("types"));
  const results = await searchProjectMemory(slug, query, userId, { limit, types });

  if (results === null) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    query,
    results,
  });
}
