import { ArrowRight, FolderKanban, GitPullRequest, Waypoints } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const summaryCards = [
  { title: "Projects", value: "12", description: "7 active, 3 onboarding", icon: FolderKanban },
  { title: "Pending handoffs", value: "18", description: "across Codex, Claude, and Cursor", icon: Waypoints },
  { title: "Writable repos", value: "4", description: "git-backed architecture updates", icon: GitPullRequest },
] as const;

export function SummaryCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {summaryCards.map((item) => (
        <Card key={item.title} className="shadow-xs">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="grid size-7 place-items-center rounded-lg border bg-muted">
                  <item.icon className="size-4" />
                </div>
                {item.title}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="text-2xl leading-none tracking-tight">{item.value}</div>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground tabular-nums leading-none">{item.description}</p>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
