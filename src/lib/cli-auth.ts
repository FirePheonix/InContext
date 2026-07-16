import { prisma } from "@/lib/prisma";

import { createHash, randomBytes } from "node:crypto";

const CLI_TOKEN_PREFIX = "ict_";
const DEFAULT_CLI_SESSION_DAYS = 90;

export type CliSessionActor = {
  deviceId: string;
  sessionId: string;
  userId: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPlainCliToken() {
  return `${CLI_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function isLoopbackCallbackUrl(value: string) {
  try {
    const url = new URL(value);

    if (!(url.protocol === "http:" || url.protocol === "https:")) {
      return false;
    }

    return ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export async function issueCliSession(
  userId: string,
  input: {
    hostname?: string | null;
    label: string;
    platform?: string | null;
  },
) {
  const label = input.label.trim();

  if (!label) {
    throw new Error("CLI device label is required.");
  }

  const device = await prisma.cliDevice.create({
    data: {
      userId,
      label,
      platform: input.platform?.trim() || null,
      hostname: input.hostname?.trim() || null,
      lastSeenAt: new Date(),
    },
  });

  const plainToken = createPlainCliToken();
  const tokenHash = hashToken(plainToken);

  const session = await prisma.cliSession.create({
    data: {
      userId,
      deviceId: device.id,
      tokenHash,
      tokenHint: plainToken.slice(-6),
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + DEFAULT_CLI_SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.auditEvent.create({
    data: {
      userId,
      deviceId: device.id,
      cliSessionId: session.id,
      action: "cli_session.issued",
      targetType: "cli_session",
      targetId: session.id,
      detailJson: JSON.stringify({
        hostname: device.hostname,
        label: device.label,
        platform: device.platform,
      }),
    },
  });

  return {
    device,
    session,
    token: plainToken,
  };
}

export async function revokeCliSession(sessionId: string, userId: string) {
  const session = await prisma.cliSession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
  });

  if (!session) {
    return null;
  }

  return prisma.cliSession.update({
    where: { id: session.id },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function authenticateCliBearerToken(token: string): Promise<CliSessionActor | null> {
  if (!token.startsWith(CLI_TOKEN_PREFIX)) {
    return null;
  }

  const session = await prisma.cliSession.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    include: {
      device: true,
    },
  });

  if (!session || session.revokedAt) {
    return null;
  }

  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    return null;
  }

  await prisma.cliSession.update({
    where: { id: session.id },
    data: {
      lastUsedAt: new Date(),
      device: {
        update: {
          lastSeenAt: new Date(),
        },
      },
    },
  });

  return {
    userId: session.userId,
    sessionId: session.id,
    deviceId: session.deviceId,
  };
}
