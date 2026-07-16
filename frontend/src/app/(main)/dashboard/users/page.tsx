import { Users } from "./_components/users";
import { requireCurrentSessionUser } from "@/lib/session-user";
import { getProjectRows } from "@/lib/projects";

export default async function Page() {
  const user = await requireCurrentSessionUser();
  const projects = await getProjectRows(user.id);

  return <Users users={projects} />;
}
