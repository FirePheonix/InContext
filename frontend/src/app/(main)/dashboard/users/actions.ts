"use server";

import { revalidatePath } from "next/cache";

import { createProject, type CreateProjectInput } from "@/lib/project-service";

export async function createProjectAction(input: CreateProjectInput) {
  const project = await createProject(input);

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/productivity");
  revalidatePath("/dashboard/infrastructure");
  revalidatePath("/dashboard/roles");

  return project;
}
