import { FilePlus2, FileText, GitBranchPlus, RefreshCcw, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

const quickActions = [
  { label: "Create Project", icon: FilePlus2 },
  { label: "Write Summary", icon: FileText },
  { label: "Open Repo Sync", icon: GitBranchPlus },
  { label: "Refresh Index", icon: RefreshCcw },
  { label: "Upload Context", icon: Upload },
] as const;

export function QuickActions() {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl tracking-tight">Quick Actions</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {quickActions.map((action) => (
          <Button key={action.label} variant="outline" className="justify-start">
            <action.icon data-icon="inline-start" />
            {action.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
