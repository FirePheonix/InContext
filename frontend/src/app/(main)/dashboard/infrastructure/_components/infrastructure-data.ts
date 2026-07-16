import type { SimpleIcon } from "simple-icons";

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

export type InfrastructureSummary = {
  freshContextPercent: number;
  lastUpdatedLabel: string;
  projectCount: number;
  sourceCount: number;
  writablePathCount: number;
};
