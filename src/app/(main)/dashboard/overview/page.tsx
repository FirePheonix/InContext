import { getProductivityDashboardData } from "@/lib/productivity";
import { requireCurrentSessionUser } from "@/lib/session-user";

import { FocusCard } from "../productivity/_components/focus-card";
import { ProjectsSection } from "../productivity/_components/projects-section";
import { QuickActions } from "../productivity/_components/quick-actions";
import { RecentNotesCard } from "../productivity/_components/recent-notes-card";
import { SummaryCards } from "../productivity/_components/summary-cards";
import { TasksSection } from "../productivity/_components/tasks-section";
import { WeeklySummaryCard } from "../productivity/_components/weekly-summary-card";

export default async function Page() {
  const user = await requireCurrentSessionUser();
  const dashboard = await getProductivityDashboardData(user.id);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="lg:col-span-9">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl text-foreground leading-none tracking-tight">
              One control plane for agent context.
            </h1>
            <p className="text-lg text-muted-foreground leading-none">
              Track what each project means, how to resume it, what repos are linked, and which agents can safely write
              back.
            </p>
          </div>
          <SummaryCards items={dashboard.summaryCards} />
          <TasksSection initialItems={dashboard.tasks} />
          <ProjectsSection projects={dashboard.highlights} />
          <QuickActions />
        </div>
      </section>

      <section className="flex flex-col gap-6 lg:col-span-3">
        <FocusCard />
        <RecentNotesCard notes={dashboard.notes} />
        <WeeklySummaryCard />
      </section>
    </div>
  );
}
