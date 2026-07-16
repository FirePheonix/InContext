import { getAccessGovernanceData } from "@/lib/access-governance";
import { requireCurrentSessionUser } from "@/lib/session-user";

import { Roles } from "./_components/roles";

export default async function Page() {
  const user = await requireCurrentSessionUser();
  const roles = await getAccessGovernanceData(user.id);

  return <Roles roles={roles} />;
}
