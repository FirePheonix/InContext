import { cache } from "react";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceAccessForUser } from "@/lib/project-access";

export type SessionAppUser = {
  email: string;
  id: string;
  image: string;
  name: string;
  roleLabel: string;
};

export const getCurrentSessionUser = cache(async (): Promise<SessionAppUser | null> => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      _count: {
        select: {
          ownedProjects: true,
        },
      },
    },
  });

  if (!user?.email) {
    return null;
  }

  await ensureWorkspaceAccessForUser(user.id);

  return {
    id: user.id,
    name: user.name ?? user.email.split("@")[0],
    email: user.email,
    image: user.image ?? "",
    roleLabel: user._count.ownedProjects > 0 ? "workspace owner" : "member",
  };
});

export async function requireCurrentSessionUser() {
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect("/auth/v2/login");
  }

  return user;
}
