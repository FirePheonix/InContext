import Link from "next/link";

import { Boxes, FilePlus2, LockKeyhole, Server } from "lucide-react";

import { CreateProjectDialog } from "@/app/(main)/dashboard/users/_components/create-project-dialog";
import { Button } from "@/components/ui/button";

const quickActions = [
  { label: "Projects", icon: Boxes, href: "/dashboard/projects" },
  { label: "Architecture", icon: Server, href: "/dashboard/infrastructure" },
  { label: "Agent Access", icon: LockKeyhole, href: "/dashboard/roles" },
] as const;

export function QuickActions() {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl tracking-tight">Quick Actions</h2>
        <CreateProjectDialog />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((action) => (
          <Button key={action.label} variant="outline" className="justify-start" asChild>
            <Link href={action.href}>
              <action.icon data-icon="inline-start" />
              {action.label}
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
