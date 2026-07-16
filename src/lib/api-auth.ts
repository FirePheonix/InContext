import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { authenticateCliBearerToken } from "@/lib/cli-auth";

export type ApiActor = {
  cliDeviceId?: string;
  cliSessionId?: string;
  userId: string;
};

function getBearerToken(request?: Request) {
  const authHeader = request?.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

export async function getApiActor(request?: Request): Promise<ApiActor | null> {
  const bearerToken = getBearerToken(request);

  if (bearerToken) {
    const cliSession = await authenticateCliBearerToken(bearerToken);

    if (cliSession) {
      return {
        userId: cliSession.userId,
        cliDeviceId: cliSession.deviceId,
        cliSessionId: cliSession.sessionId,
      };
    }
  }

  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    userId: session.user.id,
  };
}

export async function getApiSessionUserId(request?: Request) {
  const actor = await getApiActor(request);

  return actor?.userId ?? null;
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
