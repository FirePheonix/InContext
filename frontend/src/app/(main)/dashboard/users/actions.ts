"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

const DEFAULT_OWNER_EMAIL = "owner@contexthub.local";
const DEFAULT_OWNER_NAME = "Context Hub Owner";

type CreateProjectInput = {
  architecturePath?: string;
  contextPath?: string;
  defaultBranch?: string;
  description?: string;
  name: string;
  repoUrl?: string;
  slug?: string;
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getOrCreateOwner() {
  const existing = await prisma.user.findUnique({
    where: { email: DEFAULT_OWNER_EMAIL },
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      email: DEFAULT_OWNER_EMAIL,
      name: DEFAULT_OWNER_NAME,
    },
  });
}

export async function createProjectAction(input: CreateProjectInput) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Project name is required.");
  }

  const owner = await getOrCreateOwner();
  const baseSlug = toSlug(input.slug?.trim() || name);

  if (!baseSlug) {
    throw new Error("Project slug could not be generated.");
  }

  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.project.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      description: input.description?.trim() || null,
      repoUrl: input.repoUrl?.trim() || null,
      defaultBranch: input.defaultBranch?.trim() || "main",
      contextPath: input.contextPath?.trim() || null,
      architecturePath: input.architecturePath?.trim() || null,
      status: "DRAFT",
      createdById: owner.id,
      memberships: {
        create: {
          userId: owner.id,
          role: "OWNER",
        },
      },
      summaries: {
        create: {
          title: "Project created",
          kind: "GOAL",
          content: `Bootstrap context created for ${name}.`,
          authorId: owner.id,
          isPinned: true,
        },
      },
    },
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/productivity");

  return project;
}
