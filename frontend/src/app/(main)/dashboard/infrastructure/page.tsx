import { getInfrastructurePageData } from "@/lib/infrastructure";

import { InfrastructureHeader } from "./_components/infrastructure-header";
import { ProjectEnvironments } from "./_components/project-environments";

export default async function Page() {
  const { groups, summary } = await getInfrastructurePageData();

  return (
    <div className="flex flex-col gap-4">
      <InfrastructureHeader summary={summary} />

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <ProjectEnvironments key={group.name} group={group} />
        ))}
      </div>
    </div>
  );
}
