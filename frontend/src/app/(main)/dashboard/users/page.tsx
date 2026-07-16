import { Users } from "./_components/users";
import { getProjectRows } from "@/lib/projects";

export default async function Page() {
  const projects = await getProjectRows();

  return <Users users={projects} />;
}
