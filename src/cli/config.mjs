import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(os.homedir(), ".incontext");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const EMPTY_CONFIG = {
  version: 1,
  projects: [],
};

export async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return {
      ...EMPTY_CONFIG,
      ...parsed,
      projects: parsed.projects ?? [],
    };
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

export async function saveConfig(config) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function getConfigPath() {
  return CONFIG_FILE;
}

export function upsertProjectState(config, project) {
  const projects = config.projects.filter((entry) => entry.projectSlug !== project.projectSlug && entry.repoRoot !== project.repoRoot);
  projects.unshift(project);

  return {
    ...config,
    projects,
  };
}

export function findProjectState(config, projectSlug) {
  return config.projects.find((entry) => entry.projectSlug === projectSlug) ?? null;
}
