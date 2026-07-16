import { getProjectRows } from "@/lib/projects";
import { requireCurrentSessionUser } from "@/lib/session-user";

import { Users } from "./_components/users";

export default async function Page() {
  const user = await requireCurrentSessionUser();
  const projects = await getProjectRows(user.id);

  return <Users users={projects} />;
}
