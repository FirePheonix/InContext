import { FolderGit2, Network, PanelsTopLeft } from "lucide-react";

import { CreateProjectDialog } from "@/app/(main)/dashboard/users/_components/create-project-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectHighlight } from "@/lib/productivity";

const icons = [PanelsTopLeft, Network, FolderGit2] as const;

export function ProjectsSection({ projects }: { projects: ProjectHighlight[] }) {
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
          <CreateProjectDialog />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {projects.map((project, index) => {
          const Icon = icons[index % icons.length];

          return (
            <Card key={project.title} className="shadow-xs">
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
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
          );
        })}
      </div>
    </section>
  );
}
