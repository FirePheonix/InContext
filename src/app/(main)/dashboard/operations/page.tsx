import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import { Activity, Command, FolderGit2, RadioTower, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOperationsDashboardData } from "@/lib/operations";
import { requireCurrentSessionUser } from "@/lib/session-user";

const summaryIcons = [Command, FolderGit2, RadioTower, RefreshCcw] as const;

export default async function OperationsPage() {
  const user = await requireCurrentSessionUser();
  const data = await getOperationsDashboardData(user.id);
  const summaryCards = [
    {
      label: "CLI devices",
      value: data.summary.activeDevices,
      help: "Signed-in local devices visible to the workspace.",
    },
    {
      label: "Linked repos",
      value: data.summary.linkedRepos,
      help: "Repo roots currently mapped into projects.",
    },
    {
      label: "Live bridges",
      value: data.summary.liveAgentBridges,
      help: "Projects with recent agent bridge activity.",
    },
    {
      label: "Stale notebooks",
      value: data.summary.staleNotebooks,
      help: "Projects whose shared notebook looks old enough to review.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl leading-none tracking-tight text-foreground">Operations</h1>
        <p className="text-lg leading-none text-muted-foreground">
          One page for install health, linked repos, bridge freshness, resume hashes, and recent captured observations.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => {
          const Icon = summaryIcons[index];

          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>{card.label}</CardTitle>
                  <CardDescription>{card.help}</CardDescription>
                </div>
                <div className="rounded-xl border bg-muted/40 p-2">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Linked repos and notebook health</CardTitle>
            <CardDescription>
              Check which repo path is active, whether the notebook is fresh, and where to resume.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.links.map((link) => (
              <div key={link.id} className="rounded-xl border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/projects/${link.projectSlug}`} className="font-medium hover:underline">
                    {link.projectName}
                  </Link>
                  <Badge variant={link.isActive ? "default" : "outline"}>
                    {link.isActive ? "Active link" : "Linked"}
                  </Badge>
                  <Badge variant="outline">{link.notebookState}</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{link.repoRoot}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Branch {link.branch ?? "unknown"} · Notebook{" "}
                  {link.notebookUpdatedAt
                    ? formatDistanceToNow(new Date(link.notebookUpdatedAt), { addSuffix: true })
                    : "not created yet"}
                </div>
              </div>
            ))}
            {data.links.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No linked repos yet. Run `incontext project link &lt;project-slug&gt;` from a repo root.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent resume points</CardTitle>
            <CardDescription>These are the hashes the CLI can resume immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.resumePoints.map((point) => (
              <div key={point.id} className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{point.hash}</Badge>
                  <Link href={`/dashboard/projects/${point.projectSlug}`} className="font-medium hover:underline">
                    {point.projectName}
                  </Link>
                </div>
                <div className="mt-2 text-sm">{point.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {point.branch ? `Branch ${point.branch} · ` : ""}
                  {formatDistanceToNow(new Date(point.createdAt), { addSuffix: true })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>CLI devices</CardTitle>
            <CardDescription>Logged-in machines that can run the local bridge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.devices.map((device) => (
              <div key={device.id} className="rounded-xl border bg-muted/30 p-4">
                <div className="font-medium">{device.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {device.hostname ?? "Unknown host"} · {device.platform ?? "Unknown platform"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Last seen{" "}
                  {device.lastSeenAt ? formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true }) : "never"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent observations</CardTitle>
            <CardDescription>Draft and promoted observations captured before notebook promotion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.observations.map((observation) => (
              <div key={observation.id} className="rounded-xl border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={observation.status === "PROMOTED" ? "default" : "outline"}>
                    {observation.status}
                  </Badge>
                  <Badge variant="outline">
                    {observation.sourceAgent ?? observation.sourceLabel ?? "Manual capture"}
                  </Badge>
                  <Link href={`/dashboard/projects/${observation.projectSlug}`} className="font-medium hover:underline">
                    {observation.projectName}
                  </Link>
                </div>
                <div className="mt-2 text-sm">{observation.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(observation.updatedAt), { addSuffix: true })}
                </div>
              </div>
            ))}
            {data.observations.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No observations captured yet. Use `incontext capture` or the local MCP observation tools.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bridge freshness by project</CardTitle>
          <CardDescription>Recent agent nodes and notebook freshness for each project.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {data.bridges.map((bridge) => (
            <div key={bridge.projectId} className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/projects/${bridge.projectSlug}`} className="font-medium hover:underline">
                  {bridge.projectName}
                </Link>
                <Badge variant="outline">{bridge.notebookState}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Notebook{" "}
                {bridge.notebookUpdatedAt
                  ? formatDistanceToNow(new Date(bridge.notebookUpdatedAt), { addSuffix: true })
                  : "not created yet"}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {bridge.recentAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{agent.label}</div>
                      <div className="text-xs text-muted-foreground">{agent.agent}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Activity className="size-3.5" />
                      {agent.lastSyncedAt
                        ? formatDistanceToNow(new Date(agent.lastSyncedAt), { addSuffix: true })
                        : "No sync"}
                    </div>
                  </div>
                ))}
                {bridge.recentAgents.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    No active agent nodes yet.
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
