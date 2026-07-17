import { readFile, writeFile } from "node:fs/promises";

import { apiRequest } from "./api.mjs";

export function resolveProjectSlug(config, explicitSlug) {
  const targetSlug = explicitSlug || config.activeProjectSlug;

  if (!targetSlug) {
    throw new Error("No active project is set. Pass --project or link/resume a project first.");
  }

  return targetSlug;
}

export async function createObservation(config, projectSlug, input) {
  return apiRequest({
    config,
    path: `/api/projects/${encodeURIComponent(projectSlug)}/observations`,
    method: "POST",
    body: input,
  });
}

export async function listObservations(config, projectSlug, options = {}) {
  const searchParams = new URLSearchParams();

  if (typeof options.limit === "number") {
    searchParams.set("limit", String(options.limit));
  }

  if (options.status) {
    searchParams.set("status", options.status);
  }

  return apiRequest({
    config,
    path: `/api/projects/${encodeURIComponent(projectSlug)}/observations${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
  });
}

export async function promoteObservation(config, projectSlug, observationId) {
  return apiRequest({
    config,
    path: `/api/projects/${encodeURIComponent(projectSlug)}/observations/${encodeURIComponent(observationId)}`,
    method: "PATCH",
    body: {
      action: "promote",
    },
  });
}

export async function exportProjectSnapshotToFile(config, projectSlug, outputPath) {
  const result = await apiRequest({
    config,
    path: `/api/projects/${encodeURIComponent(projectSlug)}/export`,
  });

  await writeFile(outputPath, `${JSON.stringify(result.snapshot, null, 2)}\n`, "utf8");

  return result.snapshot;
}

export async function importProjectSnapshotFromFile(config, filePath, options = {}) {
  const raw = await readFile(filePath, "utf8");
  const snapshot = JSON.parse(raw);

  return apiRequest({
    config,
    path: "/api/projects/import",
    method: "POST",
    body: {
      snapshot,
      targetSlug: options.projectSlug,
      mode: options.mode,
    },
  });
}

export async function loadViewerData(config, projectSlug, limit = 8) {
  const [workspace, entries, timeline, observations] = await Promise.all([
    apiRequest({
      config,
      path: `/api/projects/${encodeURIComponent(projectSlug)}/workspace`,
    }),
    apiRequest({
      config,
      path: `/api/projects/${encodeURIComponent(projectSlug)}/entries?limit=${limit}`,
    }),
    apiRequest({
      config,
      path: `/api/projects/${encodeURIComponent(projectSlug)}/timeline?limit=${limit}`,
    }),
    apiRequest({
      config,
      path: `/api/projects/${encodeURIComponent(projectSlug)}/observations?limit=${limit}`,
    }),
  ]);

  return {
    workspace,
    entries: entries.entries,
    timeline: timeline.items,
    observations: observations.observations,
  };
}

export function printViewerData(data) {
  const { workspace, entries, timeline, observations } = data;

  console.log(`# ${workspace.project.name} (${workspace.project.slug})`);
  console.log(`Status: ${workspace.project.status}`);
  console.log(`Notebook: ${workspace.notebook?.title ?? "none"}`);
  console.log(`Agents: ${workspace.agents.length}`);
  console.log(`Observations: ${observations.length}`);
  console.log("");

  if (workspace.notebook?.content) {
    console.log("Notebook");
    console.log(workspace.notebook.content);
    console.log("");
  }

  console.log("Recent entries");
  for (const entry of entries) {
    console.log(`- [${entry.type}] ${entry.title}`);
    if (entry.excerpt) {
      console.log(`  ${entry.excerpt}`);
    }
  }

  console.log("");
  console.log("Recent observations");
  for (const observation of observations) {
    console.log(`- [${observation.status}] ${observation.title}`);
    console.log(`  ${observation.content}`);
  }

  console.log("");
  console.log("Timeline");
  for (const item of timeline) {
    console.log(`- [${item.kind}] ${item.label} (${item.createdAt})`);
  }
}
