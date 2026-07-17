import { notFound } from "next/navigation";

import { getProjectWorkspace } from "@/lib/project-service";
import { requireCurrentSessionUser } from "@/lib/session-user";

import { ProjectWorkspace } from "./project-workspace";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireCurrentSessionUser();
  const { slug } = await params;
  const workspace = await getProjectWorkspace(slug, user.id);

  if (!workspace) {
    notFound();
  }

  return <ProjectWorkspace initialWorkspace={workspace} />;
}
