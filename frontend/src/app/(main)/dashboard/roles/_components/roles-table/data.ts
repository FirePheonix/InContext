export type Role = {
  role: string;
  group: string;
  accessLevel: string;
  users: number;
  permissionSets: string[];
  lastReview: string;
  owner: string;
  status: "Active" | "Needs review";
};

export const roles: Role[] = [
  {
    role: "Codex CLI",
    group: "Built-in agents",
    accessLevel: "Read + write",
    users: 7,
    permissionSets: ["Project summaries", "Session recall", "Architecture notes", "Repo PRs"],
    lastReview: "Jul 15, 2026",
    owner: "Platform",
    status: "Active",
  },
  {
    role: "Claude Code",
    group: "Built-in agents",
    accessLevel: "Read + propose",
    users: 5,
    permissionSets: ["Project summaries", "Session recall", "Architecture drafts", "Handoff notes"],
    lastReview: "Jul 14, 2026",
    owner: "Platform",
    status: "Active",
  },
  {
    role: "Cursor",
    group: "Built-in agents",
    accessLevel: "Read only",
    users: 4,
    permissionSets: ["Project summaries", "Session recall", "Architecture notes"],
    lastReview: "Jul 11, 2026",
    owner: "Platform",
    status: "Active",
  },
  {
    role: "GitHub App token",
    group: "Write tokens",
    accessLevel: "Repo write",
    users: 2,
    permissionSets: ["PR creation", "Branch writes", "Architecture sync", "Checks"],
    lastReview: "Jul 12, 2026",
    owner: "Security",
    status: "Needs review",
  },
  {
    role: "Frontend PAT",
    group: "Write tokens",
    accessLevel: "Scoped write",
    users: 1,
    permissionSets: ["Frontend repo", "Summary updates", "Architecture notes"],
    lastReview: "Jul 10, 2026",
    owner: "Security",
    status: "Needs review",
  },
  {
    role: "Backend PAT",
    group: "Write tokens",
    accessLevel: "Scoped write",
    users: 1,
    permissionSets: ["Backend repo", "Architecture sync", "Pull requests"],
    lastReview: "Jul 9, 2026",
    owner: "Security",
    status: "Active",
  },
  {
    role: "Audit bot",
    group: "Review only",
    accessLevel: "Read only",
    users: 3,
    permissionSets: ["Policy diffs", "Write history", "Token usage"],
    lastReview: "Jul 13, 2026",
    owner: "Ops",
    status: "Active",
  },
  {
    role: "Architecture reviewer",
    group: "Review only",
    accessLevel: "Scoped",
    users: 2,
    permissionSets: ["Architecture drafts", "Decision logs", "Approval queue"],
    lastReview: "Jul 8, 2026",
    owner: "Ops",
    status: "Active",
  },
  {
    role: "Project creator flow",
    group: "Review only",
    accessLevel: "Scoped",
    users: 2,
    permissionSets: ["Registry writes", "Starter summary", "Onboarding checklist"],
    lastReview: "Jul 7, 2026",
    owner: "Platform",
    status: "Active",
  },
];
