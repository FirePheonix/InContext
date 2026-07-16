import { NextResponse } from "next/server";

import { auth } from "@/auth";

export async function getApiSessionUserId() {
  const session = await auth();

  return session?.user?.id ?? null;
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
