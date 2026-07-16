import { getAccessGovernanceData } from "@/lib/access-governance";

import { Roles } from "./_components/roles";

export default async function Page() {
  const roles = await getAccessGovernanceData();

  return <Roles roles={roles} />;
}
