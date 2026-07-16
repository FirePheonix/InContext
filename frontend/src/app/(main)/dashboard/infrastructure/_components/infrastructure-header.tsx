import { Box, Container, Filter, PlusCircle, RefreshCw, Search, Server, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

import type { InfrastructureSummary } from "./infrastructure-data";

export function InfrastructureHeader({ summary }: { summary: InfrastructureSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-medium text-2xl leading-tight tracking-tight sm:text-3xl sm:leading-none">
              Architecture & Context Sources
            </h1>
            <p className="text-muted-foreground text-sm">
              Track which adapters can read sessions, memory files, repositories, and writable architecture docs per
              project.
            </p>
          </div>

          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <span className="whitespace-nowrap text-muted-foreground text-sm">Last updated: {summary.lastUpdatedLabel}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm">
                <RefreshCw />
              </Button>
              <Button variant="outline" size="icon-sm">
                <Settings data-icon="inline-start" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="h-auto gap-1 rounded-sm px-1.5 py-0.5">
            <Container />
            {summary.projectCount} Projects
          </Badge>
          <Badge variant="outline" className="h-auto gap-1 rounded-sm px-1.5 py-0.5">
            <Box />
            {summary.sourceCount} Sources
          </Badge>
          <Badge variant="outline" className="h-auto gap-1 rounded-sm px-1.5 py-0.5">
            <Server />
            {summary.writablePathCount} Writable Paths
          </Badge>
          <Badge variant="outline" className="h-auto gap-1 rounded-sm px-1.5 py-0.5">
            <span className="size-2 rounded-full bg-green-600 dark:bg-green-500" />
            {summary.freshContextPercent}% Fresh Context
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        <InputGroup className="flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search by project, path, or source..." />
          <InputGroupAddon align="inline-end">
            <Kbd>Ctrl K</Kbd>
          </InputGroupAddon>
        </InputGroup>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <PlusCircle data-icon="inline-start" />
            Project
          </Button>
          <Button variant="outline">
            <PlusCircle data-icon="inline-start" />
            Source
          </Button>
          <Button variant="outline">
            <PlusCircle data-icon="inline-start" />
            Access mode
          </Button>
          <Button variant="outline">
            <PlusCircle data-icon="inline-start" />
            Repo link
          </Button>
          <Button variant="outline">
            <PlusCircle data-icon="inline-start" />
            Freshness
          </Button>
          <Button variant="outline">
            <Filter data-icon="inline-start" />
            Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
