import type { SimpleIcon } from "simple-icons";
import { siGithub, siNextdotjs, siNodedotjs, siReact } from "simple-icons";

export interface InfrastructureEnvironment {
  source: string;
  adapter: {
    name: string;
    icon: SimpleIcon;
  };
  mode: "Read-only" | "Writable" | "Planned";
  health: "Synced" | "Lagging" | "Blocked";
  freshness: string;
  coverage: string;
  token: string;
  scope: string;
  resources: {
    recall: number;
    architecture: number;
    write: number;
  };
}

export interface InfrastructureGroup {
  name: string;
  organization: string;
  rows: InfrastructureEnvironment[];
}

export const infrastructureGroups: InfrastructureGroup[] = [
  {
    name: "reference-mcp",
    organization: "Core recall adapters",
    rows: [
      {
        source: "~/.codex/sessions/**/*.jsonl",
        adapter: {
          name: "Codex parser",
          icon: siNodedotjs,
        },
        mode: "Read-only",
        health: "Synced",
        freshness: "2m ago",
        coverage: "412 turns",
        token: "Local filesystem",
        scope: "Codex session history",
        resources: { recall: 94, architecture: 51, write: 0 },
      },
      {
        source: "~/.claude/projects/**/*.jsonl",
        adapter: {
          name: "Claude parser",
          icon: siReact,
        },
        mode: "Read-only",
        health: "Synced",
        freshness: "5m ago",
        coverage: "289 turns",
        token: "Local filesystem",
        scope: "Claude project transcripts",
        resources: { recall: 91, architecture: 44, write: 0 },
      },
    ],
  },
  {
    name: "frontend-dashboard",
    organization: "Project context registry",
    rows: [
      {
        source: "AGENTS.md + architecture/*.md",
        adapter: {
          name: "Next.js console",
          icon: siNextdotjs,
        },
        mode: "Writable",
        health: "Synced",
        freshness: "8m ago",
        coverage: "9 memory files",
        token: "GitHub App token",
        scope: "repo:frontend-dashboard",
        resources: { recall: 86, architecture: 93, write: 82 },
      },
      {
        source: "summary.log + handoffs/*.md",
        adapter: {
          name: "Handoff writer",
          icon: siNodedotjs,
        },
        mode: "Writable",
        health: "Lagging",
        freshness: "41m ago",
        coverage: "3 active handoffs",
        token: "Scoped service token",
        scope: "summary:write",
        resources: { recall: 72, architecture: 79, write: 74 },
      },
    ],
  },
  {
    name: "vedaai-backend",
    organization: "Repo write-back",
    rows: [
      {
        source: "github.com/org/vedaai-backend",
        adapter: {
          name: "Git bridge",
          icon: siGithub,
        },
        mode: "Writable",
        health: "Lagging",
        freshness: "1h ago",
        coverage: "22 architecture files",
        token: "Personal access token",
        scope: "repo + pull_requests",
        resources: { recall: 77, architecture: 88, write: 69 },
      },
    ],
  },
  {
    name: "new project onboarding",
    organization: "Unconnected projects",
    rows: [],
  },
];
