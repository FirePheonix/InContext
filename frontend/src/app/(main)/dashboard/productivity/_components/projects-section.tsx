import { addDays, format } from "date-fns";
import { FolderGit2, Network, PanelsTopLeft, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const today = new Date();

const projects = [
  {
    title: "frontend-dashboard",
    status: "Active",
    description: "Summaries, decisions, and open handoffs stay searchable for every agent.",
    progress: 82,
    due: `Synced ${format(addDays(today, -1), "MMM d")}`,
    icon: PanelsTopLeft,
  },
  {
    title: "reference-mcp",
    status: "Designing",
    description: "Cross-agent recall, project creation, and architecture write-back via MCP.",
    progress: 46,
    due: `Review ${format(addDays(today, 6), "MMM d")}`,
    icon: Network,
  },
  {
    title: "vedaai-backend",
    status: "Needs review",
    description: "Repo-linked architecture notes can be updated by approved write tokens.",
    progress: 68,
    due: `Token audit ${format(addDays(today, 2), "MMM d")}`,
    icon: FolderGit2,
  },
] as const;

export function ProjectsSection() {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl tracking-tight">Project Registry</h2>
        <div className="flex items-center gap-2">
          <Select defaultValue="active">
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Active" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="review">Needs review</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Plus data-icon="inline-start" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.title} className="shadow-xs">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <project.icon className="size-4 text-muted-foreground" />
                  <span>{project.title}</span>
                </div>
              </CardTitle>
              <CardAction>
                <Badge variant="outline">{project.status}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="text-sm leading-none">{project.description}</div>
                <div className="flex items-center gap-3">
                  <Progress value={project.progress} className="h-2" />
                  <span className="shrink-0 text-sm">{project.progress}%</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="py-2.5">
              <span className="text-muted-foreground">{project.due}</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
