"use client";

import "@xyflow/react/dist/style.css";

import { startTransition, useEffect, useEffectEvent, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Background,
  Controls,
  type Edge,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, Eye, FilePenLine, History, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectWorkspaceData } from "@/lib/project-service";
import { cn } from "@/lib/utils";

type WorkspaceProps = {
  initialWorkspace: ProjectWorkspaceData;
};

type NotebookNodeData = {
  content: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  title: string;
  updatedAt: string | null;
};

type AgentNodeData = {
  agent: string;
  label: string;
  lastSyncedAt: string | null;
  status: string;
};

function NotebookNode({ data }: NodeProps<Node<NotebookNodeData>>) {
  return (
    <div className="w-[350px] rounded-[30px] border border-border/70 bg-card/95 p-4 shadow-2xl shadow-black/20 backdrop-blur-sm">
      <Handle type="target" position={Position.Left} className="!size-3 !border-2 !border-background !bg-sky-500" />
      <Handle type="target" position={Position.Right} className="!size-3 !border-2 !border-background !bg-sky-500" />
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium text-base">{data.title}</div>
            <div className="text-muted-foreground text-xs">
              {data.updatedAt
                ? `Updated ${formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true })}`
                : "Shared notebook"}
            </div>
          </div>
          <Button size="sm" className="nodrag shrink-0" onClick={data.onSave} disabled={data.saving}>
            <Save />
            {data.saving ? "Saving" : "Save"}
          </Button>
        </div>
        <Textarea
          value={data.content}
          onChange={(event) => data.onChange(event.target.value)}
          className="nodrag nowheel min-h-[260px] resize-none border-border/70 bg-background/60 text-sm leading-6"
          placeholder="This is the single shared notebook for the project. Every agent reads and updates this same context."
        />
      </div>
    </div>
  );
}

function AgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  let statusTone = "border-border/70 bg-muted/50 text-muted-foreground";

  if (data.status === "ACTIVE") {
    statusTone = "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  } else if (data.status === "BLOCKED") {
    statusTone = "border-destructive/30 bg-destructive/10 text-destructive";
  } else if (data.status === "WAITING") {
    statusTone = "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }

  return (
    <div className="w-[186px] rounded-[26px] border border-border/60 bg-card/95 p-3 shadow-black/15 shadow-xl backdrop-blur-sm">
      <Handle type="source" position={Position.Right} className="!size-3 !border-2 !border-background !bg-blue-500" />
      <Handle type="source" position={Position.Left} className="!size-3 !border-2 !border-background !bg-orange-500" />
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback>{data.agent.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{data.label}</div>
          <div className="truncate text-muted-foreground text-xs">{data.agent}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn("rounded-sm px-2 py-1 text-[11px]", statusTone)}>
          {data.status}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {data.lastSyncedAt ? formatDistanceToNow(new Date(data.lastSyncedAt), { addSuffix: true }) : "No sync"}
        </span>
      </div>
    </div>
  );
}

const nodeTypes = {
  agent: AgentNode,
  notebook: NotebookNode,
};

function getAgentPosition(index: number) {
  const presets = [
    { x: 80, y: 90 },
    { x: 110, y: 360 },
    { x: 860, y: 120 },
    { x: 820, y: 380 },
    { x: 470, y: 560 },
  ];

  return presets[index] ?? { x: 120 + index * 26, y: 110 + index * 56 };
}

function buildNodes(
  workspace: ProjectWorkspaceData,
  draftNotebook: string,
  notebookSaving: boolean,
  onNotebookChange: (value: string) => void,
  onNotebookSave: () => void,
): Array<Node<NotebookNodeData | AgentNodeData>> {
  const notebookNode: Node<NotebookNodeData> = {
    id: "project-notebook",
    type: "notebook",
    position: { x: 420, y: 160 },
    data: {
      title: workspace.notebook ? workspace.notebook.title : `${workspace.project.name} notebook`,
      content: draftNotebook,
      updatedAt: workspace.notebook ? workspace.notebook.updatedAt : null,
      onChange: onNotebookChange,
      onSave: onNotebookSave,
      saving: notebookSaving,
    },
  };

  const agentNodes: Array<Node<AgentNodeData>> = workspace.agents.map((agent, index) => ({
    id: agent.id,
    type: "agent",
    position: {
      x: agent.position.x ?? getAgentPosition(index).x,
      y: agent.position.y ?? getAgentPosition(index).y,
    },
    data: {
      label: agent.label,
      agent: agent.agent,
      lastSyncedAt: agent.lastSyncedAt,
      status: agent.status,
    },
  }));

  return [notebookNode, ...agentNodes];
}

function buildEdges(workspace: ProjectWorkspaceData): Edge[] {
  return workspace.agents.map((agent, index) => ({
    id: `edge-${agent.id}`,
    source: agent.id,
    target: "project-notebook",
    animated: agent.status === "ACTIVE",
    style: {
      stroke: index % 2 === 0 ? "#2563eb" : "#f97316",
      strokeWidth: 2,
    },
  }));
}

function ActivityDialog({ activity }: { activity: ProjectWorkspaceData["activity"] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History />
          Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activity Log</DialogTitle>
          <DialogDescription>Every notebook and agent-board update is recorded here.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[480px]">
          <div className="flex flex-col gap-3 pr-2">
            {activity.map((event) => (
              <div key={event.id} className="rounded-xl border bg-muted/30 p-3">
                <div className="flex items-start gap-3">
                  <Avatar size="sm">
                    <AvatarFallback>
                      {(event.user.name || event.user.email || "U").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-sm">
                        {event.user.name || event.user.email || "Unknown user"}
                      </span>
                      <Badge variant="outline" className="rounded-sm text-[10px]">
                        {event.action}
                      </Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </div>
                    {"agentLabel" in event.detail && typeof event.detail.agentLabel === "string" ? (
                      <div className="mt-2 text-muted-foreground text-xs">Agent: {event.detail.agentLabel}</div>
                    ) : null}
                    {"label" in event.detail && typeof event.detail.label === "string" ? (
                      <div className="mt-2 text-muted-foreground text-xs">Node: {event.detail.label}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {activity.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
                No agent or notebook activity yet.
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ObservationDialog({ observations }: { observations: ProjectWorkspaceData["observations"] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye />
          Observations
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Captured observations</DialogTitle>
          <DialogDescription>Draft capture stays here until it is promoted into the shared notebook.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[420px]">
          <div className="flex flex-col gap-3 pr-2">
            {observations.map((observation) => (
              <div key={observation.id} className="rounded-xl border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={observation.status === "PROMOTED" ? "default" : "outline"}>
                    {observation.status}
                  </Badge>
                  {observation.sourceAgent ? <Badge variant="outline">{observation.sourceAgent}</Badge> : null}
                </div>
                <div className="mt-3 font-medium text-sm">{observation.title}</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{observation.content}</div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {observation.author?.name || observation.author?.email || observation.sourceLabel || "Unknown author"}{" "}
                  · {formatDistanceToNow(new Date(observation.updatedAt), { addSuffix: true })}
                </div>
              </div>
            ))}
            {observations.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
                No draft observations yet. Use `incontext capture` or the local MCP observation tools.
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function EditProjectDialog({
  onSubmit,
  pending,
  project,
}: {
  onSubmit: (form: {
    defaultBranch: string;
    description: string;
    name: string;
    repoUrl: string;
    slug: string;
    status: ProjectWorkspaceData["project"]["status"];
  }) => void;
  pending: boolean;
  project: ProjectWorkspaceData["project"];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    slug: project.slug,
    description: project.description ?? "",
    repoUrl: project.repoUrl ?? "",
    defaultBranch: project.defaultBranch,
    status: project.status,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Rename, repoint, or change the state of this project. Slug changes stay globally unique.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-slug">Slug</Label>
            <Input
              id="project-slug"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="project-repo-url">Repo URL</Label>
              <Input
                id="project-repo-url"
                value={form.repoUrl}
                onChange={(event) => setForm((current) => ({ ...current, repoUrl: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-branch">Default branch</Label>
              <Input
                id="project-branch"
                value={form.defaultBranch}
                onChange={(event) => setForm((current) => ({ ...current, defaultBranch: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-status">Status</Label>
            <select
              id="project-status"
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as ProjectWorkspaceData["project"]["status"],
                }))
              }
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
        <DialogFooter showCloseButton>
          <Button
            disabled={pending}
            onClick={() => {
              onSubmit(form);
              setOpen(false);
            }}
          >
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAgentDialog({
  onSubmit,
  pending,
}: {
  onSubmit: (form: {
    agent: "CLAUDE" | "CODEX" | "CURSOR" | "OTHER";
    label: string;
    status: "ACTIVE" | "BLOCKED" | "IDLE" | "WAITING";
  }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: "",
    agent: "CODEX" as const,
    status: "ACTIVE" as const,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Spawn Agent
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spawn agent node</DialogTitle>
          <DialogDescription>Add another agent to this project's shared workspace.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="agent-label">Agent label</Label>
            <Input
              id="agent-label"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="agent-kind">Kind</Label>
              <select
                id="agent-kind"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={form.agent}
                onChange={(event) =>
                  setForm((current) => ({ ...current, agent: event.target.value as typeof form.agent }))
                }
              >
                <option value="CODEX">Codex</option>
                <option value="CLAUDE">Claude</option>
                <option value="CURSOR">Cursor</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agent-status">Status</Label>
              <select
                id="agent-status"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as typeof form.status }))
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="IDLE">Idle</option>
                <option value="WAITING">Waiting</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
          </div>
        </div>
        <DialogFooter showCloseButton>
          <Button
            disabled={pending}
            onClick={() => {
              onSubmit(form);
              setOpen(false);
            }}
          >
            {pending ? "Creating..." : "Create agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectWorkspace({ initialWorkspace }: WorkspaceProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [notebookDraft, setNotebookDraft] = useState(
    initialWorkspace.notebook ? initialWorkspace.notebook.content : "",
  );
  const [notebookSaving, setNotebookSaving] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [agentSaving, setAgentSaving] = useState(false);

  const handleNotebookSave = useEffectEvent(() => {
    void saveNotebook();
  });

  const baseNodes = useMemo(
    () => buildNodes(workspace, notebookDraft, notebookSaving, setNotebookDraft, handleNotebookSave),
    [workspace, notebookDraft, notebookSaving],
  );
  const baseEdges = useMemo(() => buildEdges(workspace), [workspace]);
  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);

  useEffect(() => {
    setNodes(buildNodes(workspace, notebookDraft, notebookSaving, setNotebookDraft, handleNotebookSave));
    setEdges(buildEdges(workspace));
  }, [workspace, notebookDraft, notebookSaving, setNodes, setEdges]);

  async function refreshWorkspace() {
    const response = await fetch(`/api/projects/${encodeURIComponent(workspace.project.slug)}/workspace`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh project workspace.");
    }

    const nextWorkspace = (await response.json()) as ProjectWorkspaceData;
    setWorkspace(nextWorkspace);
    setNotebookDraft(nextWorkspace.notebook ? nextWorkspace.notebook.content : "");
  }

  async function saveNotebook() {
    setNotebookSaving(true);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(workspace.project.slug)}/notebook`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: notebookDraft,
          title: workspace.notebook ? workspace.notebook.title : `${workspace.project.name} notebook`,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save notebook.");
      }

      await refreshWorkspace();
      toast.success("Shared notebook updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save notebook.");
    } finally {
      setNotebookSaving(false);
    }
  }

  async function createAgent(form: {
    agent: "CLAUDE" | "CODEX" | "CURSOR" | "OTHER";
    label: string;
    status: "ACTIVE" | "BLOCKED" | "IDLE" | "WAITING";
  }) {
    setAgentSaving(true);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(workspace.project.slug)}/agents`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create agent.");
      }

      await refreshWorkspace();
      toast.success("Agent node created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create agent.");
    } finally {
      setAgentSaving(false);
    }
  }

  async function updateProject(form: {
    defaultBranch: string;
    description: string;
    name: string;
    repoUrl: string;
    slug: string;
    status: ProjectWorkspaceData["project"]["status"];
  }) {
    setProjectSaving(true);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(workspace.project.slug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update project.");
      }

      const nextSlug = payload.project.slug as string;

      if (nextSlug !== workspace.project.slug) {
        startTransition(() => {
          router.push(`/dashboard/projects/${nextSlug}`);
          router.refresh();
        });
      } else {
        await refreshWorkspace();
      }

      toast.success("Project updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update project.");
    } finally {
      setProjectSaving(false);
    }
  }

  async function deleteProject() {
    const confirmed = window.confirm(
      `Delete ${workspace.project.name}? This removes the project, notebook, and activity history.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(workspace.project.slug)}`, {
        method: "DELETE",
        credentials: "include",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete project.");
      }

      toast.success("Project deleted.");
      startTransition(() => {
        router.push("/dashboard/projects");
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete project.");
    }
  }

  async function persistAgentPosition(node: Node) {
    if (node.id === "project-notebook") {
      return;
    }

    try {
      await fetch(`/api/projects/${encodeURIComponent(workspace.project.slug)}/agents/${encodeURIComponent(node.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          positionX: Math.round(node.position.x),
          positionY: Math.round(node.position.y),
        }),
      });
    } catch {
      // Keep dragging optimistic; refresh will reconcile later.
    }
  }

  return (
    <ReactFlowProvider>
      <section className="relative h-[calc(100vh-var(--dashboard-header-height)-3rem)] overflow-hidden rounded-[28px] border bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_28%),radial-gradient(circle_at_right,_rgba(249,115,22,0.08),_transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.02))] shadow-xs">
        <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-5">
          <div className="flex min-w-0 items-start gap-3">
            <Button variant="outline" size="icon-sm" asChild>
              <Link href="/dashboard/projects">
                <ChevronLeft />
              </Link>
            </Button>
            <div className="rounded-2xl border bg-card/90 px-4 py-3 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="truncate font-medium">{workspace.project.slug}</div>
                <Badge variant="outline">{workspace.project.status}</Badge>
              </div>
              <div className="mt-1 text-muted-foreground text-sm">
                {workspace.project.description || "Shared project workspace"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">
              {workspace.agents.length} agents
            </Badge>
            <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">
              {workspace.observations.length} observations
            </Badge>
            <AddAgentDialog onSubmit={createAgent} pending={agentSaving} />
            <ObservationDialog observations={workspace.observations} />
            <ActivityDialog activity={workspace.activity} />
            <EditProjectDialog onSubmit={updateProject} pending={projectSaving} project={workspace.project} />
            <Button variant="destructive" size="sm" onClick={deleteProject}>
              <Trash2 />
              Delete
            </Button>
          </div>
        </div>

        <div className="absolute inset-0 pt-24">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            onNodeDragStop={(_, node) => {
              void persistAgentPosition(node);
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} size={1} color="rgba(148,163,184,0.18)" />
            <Controls />
            <MiniMap pannable zoomable nodeBorderRadius={18} />
          </ReactFlow>
        </div>

        <div className="pointer-events-none absolute bottom-5 left-5 z-20">
          <div className="pointer-events-auto rounded-2xl border bg-card/90 px-4 py-3 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 font-medium text-sm">
              <FilePenLine className="size-4 text-muted-foreground" />
              One shared notebook per project
            </div>
            <div className="mt-1 text-muted-foreground text-xs">
              Agents can be many. The notebook is one. Every update is logged.
            </div>
          </div>
        </div>
      </section>
    </ReactFlowProvider>
  );
}
