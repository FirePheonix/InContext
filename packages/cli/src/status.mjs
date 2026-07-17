import { access } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { apiRequest } from "./api.mjs";
import { loadConfig } from "./config.mjs";
import { getGitRepoRoot } from "./git.mjs";
import { inspectIdeInstallations } from "./install.mjs";

const execFile = promisify(execFileCallback);

function formatOk(ok, label, detail) {
  return `${ok ? "OK" : "FAIL"} ${label}${detail ? ` - ${detail}` : ""}`;
}

async function pathExists(filePath) {
  if (!filePath) {
    return false;
  }

  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRootFromFilesystem(cwd) {
  let current = path.resolve(cwd);

  while (true) {
    if (await pathExists(path.join(current, ".git"))) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

async function commandExists(command) {
  if (command === "node") {
    return true;
  }

  try {
    await execFile(command, ["--version"], {
      windowsHide: true,
    });
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "EPERM" || error.code === "EACCES") {
        return true;
      }

      if (error.code === "ENOENT") {
        return false;
      }
    }

    return false;
  }
}

export async function collectLocalStatus() {
  const config = await loadConfig();
  const installations = await inspectIdeInstallations();
  const activeProject = config.activeProjectSlug
    ? (config.projects ?? []).find((project) => project.projectSlug === config.activeProjectSlug) ?? null
    : null;

  let auth = {
    configured: Boolean(config.auth?.token && config.appUrl),
    error: null,
    user: null,
    devices: [],
  };

  if (auth.configured) {
    try {
      const me = await apiRequest({
        config,
        path: "/api/cli/me",
      });

      auth = {
        configured: true,
        error: null,
        user: me.user,
        devices: me.cli.devices,
      };
    } catch (error) {
      auth = {
        configured: true,
        error: error instanceof Error ? error.message : "Failed to reach InContext.",
        user: null,
        devices: [],
      };
    }
  }

  let currentProject = null;

  if (config.activeProjectSlug && auth.configured && !auth.error) {
    try {
      currentProject = await apiRequest({
        config,
        path: `/api/projects/${encodeURIComponent(config.activeProjectSlug)}/workspace`,
      });
    } catch {
      currentProject = null;
    }
  }

  const cwdRepoRoot =
    (await getGitRepoRoot(process.cwd()).catch(() => null)) ?? (await findRepoRootFromFilesystem(process.cwd()));
  const linkedRepoExists = activeProject?.repoRoot ? await pathExists(activeProject.repoRoot) : false;
  const gitInstalled = await commandExists("git");
  const nodeInstalled = true;

  return {
    appUrl: config.appUrl ?? null,
    auth,
    activeProjectSlug: config.activeProjectSlug ?? null,
    activeProject,
    currentProject,
    cwdRepoRoot,
    linkedRepoExists,
    gitInstalled,
    nodeInstalled,
    installations,
    projectsTrackedLocally: (config.projects ?? []).length,
    lastResumeHash: config.lastResumeHash ?? null,
  };
}

export async function runDoctorChecks() {
  const status = await collectLocalStatus();
  const checks = [];

  checks.push({
    ok: status.nodeInstalled,
    label: "Node.js is available",
    detail: status.nodeInstalled ? "CLI runtime detected." : "Install Node.js 22.x or later.",
  });
  checks.push({
    ok: status.gitInstalled,
    label: "git is available",
    detail: status.gitInstalled ? "Local commit bridge can run." : "Install git to enable linked repo actions.",
  });
  checks.push({
    ok: Boolean(status.appUrl),
    label: "InContext app URL is configured",
    detail: status.appUrl ?? "Run `incontext login --app-url https://your-app`.",
  });
  checks.push({
    ok: status.auth.configured && !status.auth.error,
    label: "CLI authentication is healthy",
    detail: status.auth.error ?? (status.auth.user?.email || "Signed in."),
  });
  checks.push({
    ok: status.installations.some((item) => item.installed),
    label: "At least one IDE is wired to InContext MCP",
    detail: status.installations
      .filter((item) => item.installed)
      .map((item) => item.ide)
      .join(", ") || "Run `incontext install --ide codex` or another IDE target.",
  });
  checks.push({
    ok: Boolean(status.activeProjectSlug),
    label: "An active project is selected",
    detail: status.activeProjectSlug ?? "Run `incontext project link <project-slug>` or `incontext resume <hash>`.",
  });
  checks.push({
    ok: !status.activeProjectSlug || status.linkedRepoExists,
    label: "Linked repo path exists",
    detail:
      status.activeProject?.repoRoot ??
      "No linked repo yet. Use `incontext project link <project-slug>` from inside a git repo.",
  });
  checks.push({
    ok: !status.cwdRepoRoot || !status.activeProject?.repoRoot || status.cwdRepoRoot === status.activeProject.repoRoot,
    label: "Current terminal is inside the linked repo",
    detail:
      status.cwdRepoRoot && status.activeProject?.repoRoot
        ? `${status.cwdRepoRoot}`
        : "Open the linked repo before using git-backed agent actions.",
  });
  checks.push({
    ok: !status.activeProjectSlug || Boolean(status.currentProject?.project),
    label: "Active project context is reachable from the cloud",
    detail:
      status.currentProject?.project?.name ??
      "Active project context could not be loaded from the hosted app.",
  });

  return {
    status,
    checks,
    ok: checks.every((check) => check.ok),
  };
}

export function printStatus(status) {
  console.log(`InContext: ${status.appUrl ?? "not configured"}`);
  console.log(`Auth: ${status.auth.user?.email ?? (status.auth.error ? `error (${status.auth.error})` : "not signed in")}`);
  console.log(`Active project: ${status.activeProjectSlug ?? "none"}`);

  if (status.activeProject?.repoRoot) {
    console.log(`Linked repo: ${status.activeProject.repoRoot}${status.linkedRepoExists ? "" : " (missing)"}`);
  }

  console.log(`Tracked projects: ${status.projectsTrackedLocally}`);
  console.log(`Local git: ${status.gitInstalled ? "available" : "missing"}`);
  console.log(`Local node: ${status.nodeInstalled ? "available" : "missing"}`);
  console.log("");
  console.log("IDE installs:");

  for (const installation of status.installations) {
    console.log(
      `- ${installation.ide}: ${installation.installed ? "installed" : installation.exists ? "present but not wired" : "not installed"} (${installation.path})`,
    );
  }
}

export function printDoctor(result) {
  console.log("InContext doctor");
  console.log("");

  for (const check of result.checks) {
    console.log(formatOk(check.ok, check.label, check.detail));
  }

  console.log("");
  console.log(result.ok ? "Doctor completed with no blocking issues." : "Doctor found issues that should be fixed.");
}
