export type ProjectStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export type ProjectRow = {
  branch: string;
  description: string;
  documents: number;
  id: string;
  members: number;
  name: string;
  owner: string;
  repoHost: string;
  slug: string;
  status: ProjectStatus;
  summaries: number;
  tokens: number;
  updatedAt: string;
  updatedLabel: string;
};

export const filters = {
  status: ["All", "DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"],
  branch: ["All", "main", "develop", "release"],
};

export const statusMeta: Record<ProjectStatus, { badgeClass: string; dotClass: string; label: string }> = {
  ACTIVE: {
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
    label: "Active",
  },
  ARCHIVED: {
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground",
    label: "Archived",
  },
  DRAFT: {
    badgeClass: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    dotClass: "bg-sky-500",
    label: "Draft",
  },
  PAUSED: {
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
    label: "Paused",
  },
};
