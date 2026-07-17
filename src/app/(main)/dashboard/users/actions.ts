"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { type CreateProjectInput, createProject } from "@/lib/project-service";

export async function createProjectAction(input: CreateProjectInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must sign in before creating a project.");
  }

  const project = await createProject(input, session.user.id);

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/overview");
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/productivity");
  revalidatePath("/dashboard/infrastructure");
  revalidatePath("/dashboard/roles");

  return project;
}
