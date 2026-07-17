import { NextResponse } from "next/server";

import { getApiSessionUserId, unauthorizedJson } from "@/lib/api-auth";
import { getProjectContextEntries, type ProjectContextEntryType } from "@/lib/project-service";

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
  const limit = Number(searchParams.get("limit") || "24");
  const types = parseTypes(searchParams.get("types"));
  const entries = await getProjectContextEntries(slug, userId, { limit, types });

  if (!entries) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ entries });
}
