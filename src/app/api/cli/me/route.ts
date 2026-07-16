import { NextResponse } from "next/server";

import { getApiActor, unauthorizedJson } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const actor = await getApiActor(request);

  if (!actor) {
    return unauthorizedJson();
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    include: {
      cliDevices: {
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  if (!user) {
    return unauthorizedJson();
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    cli: {
      currentDeviceId: actor.cliDeviceId ?? null,
      currentSessionId: actor.cliSessionId ?? null,
      devices: user.cliDevices.map((device) => ({
        id: device.id,
        label: device.label,
        platform: device.platform,
        hostname: device.hostname,
        lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
        updatedAt: device.updatedAt.toISOString(),
      })),
    },
  });
}
