"use client";
"use no memo";

import Link from "next/link";

import type { ColumnDef } from "@tanstack/react-table";
import { FolderGit2, MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { type ProjectRow, statusMeta } from "./data";

function ProjectCell({ project }: { project: ProjectRow }) {
  return (
    <div className="min-w-0">
      <Link
        href={`/dashboard/projects/${project.slug}`}
        className="truncate font-medium text-foreground text-sm hover:underline"
      >
        {project.name}
      </Link>
      <div className="truncate text-muted-foreground text-sm">{project.slug}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProjectRow["status"] }) {
  const meta = statusMeta[status];

  return (
    <Badge className={cn("gap-1.5 border px-2 py-1 font-medium", meta.badgeClass)} variant="outline">
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {meta.label}
    </Badge>
  );
}

function RepoCell({ repoHost, branch }: { branch: string; repoHost: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="flex items-center gap-2 whitespace-nowrap">
        <FolderGit2 className="size-4 text-muted-foreground" />
        {repoHost}
      </span>
      <span className="text-muted-foreground text-xs">Branch: {branch}</span>
    </div>
  );
}

function ContextCell({ documents, summaries, tokens }: Pick<ProjectRow, "documents" | "summaries" | "tokens">) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="rounded-sm">
        {summaries} summaries
      </Badge>
      <Badge variant="outline" className="rounded-sm">
        {documents} docs
      </Badge>
      <Badge variant="outline" className="rounded-sm">
        {tokens} tokens
      </Badge>
    </div>
  );
}

export const usersColumns: ColumnDef<ProjectRow>[] = [
  {
    id: "search",
    accessorFn: (row) => `${row.name} ${row.slug} ${row.description} ${row.repoHost}`,
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    accessorKey: "name",
    header: "Project",
    cell: ({ row }) => <ProjectCell project={row.original} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "branch",
    header: "Repo / Branch",
    filterFn: "equalsString",
    cell: ({ row }) => <RepoCell repoHost={row.original.repoHost} branch={row.original.branch} />,
  },
  {
    id: "context",
    accessorFn: (row) => `${row.summaries} ${row.documents} ${row.tokens}`,
    header: "Context Assets",
    cell: ({ row }) => (
      <ContextCell documents={row.original.documents} summaries={row.original.summaries} tokens={row.original.tokens} />
    ),
  },
  {
    accessorKey: "owner",
    header: "Owner",
    cell: ({ row }) => <div className="text-sm">{row.original.owner}</div>,
  },
  {
    accessorKey: "members",
    header: "Members",
    cell: ({ row }) => <div className="text-sm">{row.original.members}</div>,
  },
  {
    accessorKey: "updatedAt",
    header: "Last updated",
    cell: ({ row }) => <div className="text-foreground text-sm">{row.original.updatedLabel}</div>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Open actions for ${row.original.name}`}
              className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
              size="icon-sm"
              variant="ghost"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/projects/${row.original.slug}`}>Open project</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>View summaries</DropdownMenuItem>
            <DropdownMenuItem>Inspect repo access</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Archive project</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
];
