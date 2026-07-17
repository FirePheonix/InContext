import { createServer } from "node:http";
import { exec } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

import { apiRequest } from "./api.mjs";
import { getStringFlag, parseArgs } from "./args.mjs";
import { findProjectState, getConfigPath, loadConfig, saveConfig, upsertProjectState } from "./config.mjs";
import { getGitBranch, getGitRemoteUrl, getGitRepoRoot } from "./git.mjs";
import { getInstallCommandPreview, installIdeMcpTargets, uninstallIdeMcpTargets } from "./install.mjs";
import { readContentInput } from "./io.mjs";
import { collectLocalStatus, printDoctor, printStatus, runDoctorChecks } from "./status.mjs";

const execAsync = promisify(exec);

function printHelp() {
  console.log(`InContext CLI

Usage:
  incontext login --app-url <url> [--label <name>]
  incontext install --ide <codex|cursor|claude|all>
  incontext uninstall --ide <codex|cursor|claude|all>
  incontext whoami
  incontext projects
  incontext current
  incontext status [--json]
  incontext doctor [--json]
  incontext project link <project-slug>
  incontext handoff save --title <title> [--content <text> | --file <path>]
  incontext resume <hash>
  incontext mcp serve [--agent <codex|claude|cursor|other>] [--label <name>]

Config path:
  ${getConfigPath()}
`);
}

async function openBrowser(url) {
  const platform = process.platform;

  if (platform === "win32") {
    await execAsync(`start "" "${url}"`);
    return;
  }

  if (platform === "darwin") {
    await execAsync(`open "${url}"`);
    return;
  }

  await execAsync(`xdg-open "${url}"`);
}

async function commandLogin(args) {
  const existingConfig = await loadConfig();
  const appUrl = getStringFlag(args, "app-url") ?? existingConfig.appUrl;

  if (!appUrl) {
    throw new Error("Missing app URL. Run `incontext login --app-url https://your-app`.");
  }

  const label = getStringFlag(args, "label") ?? `${os.hostname()} InContext CLI`;
  const platform = `${os.platform()}-${os.release()}`;
  const hostname = os.hostname();
  const code = Math.random().toString(36).slice(2, 10);

  const result = await new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      try {
        const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
        const requestCode = requestUrl.searchParams.get("code");
        const token = requestUrl.searchParams.get("token");
        const deviceId = requestUrl.searchParams.get("deviceId");
        const deviceLabel = requestUrl.searchParams.get("label");

        if (requestCode !== code || !token || !deviceId || !deviceLabel) {
          response.statusCode = 400;
          response.end("InContext CLI authorization failed.");
          reject(new Error("CLI authorization failed."));
          void server.close();
          return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end("<h1>InContext CLI connected.</h1><p>You can return to your terminal.</p>");
        resolve({
          token,
          deviceId,
          label: deviceLabel,
        });
        void server.close();
      } catch (error) {
        reject(error);
        void server.close();
      }
    });

    server.listen(0, "127.0.0.1", async () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Failed to start localhost callback server."));
        void server.close();
        return;
      }

      const callback = `http://127.0.0.1:${address.port}/callback`;
      const loginUrl = new URL("/cli/authorize", appUrl);
      loginUrl.searchParams.set("callback", callback);
      loginUrl.searchParams.set("code", code);
      loginUrl.searchParams.set("label", label);
      loginUrl.searchParams.set("platform", platform);
      loginUrl.searchParams.set("hostname", hostname);

      console.log(`Opening browser for InContext login at ${appUrl} ...`);
      console.log(`If nothing opens, visit:\n${loginUrl.toString()}\n`);

      try {
        await openBrowser(loginUrl.toString());
      } catch {
        // The URL is already printed; do not fail on browser-launch issues.
      }
    });
  });

  const config = await loadConfig();
  config.version = 1;
  config.appUrl = appUrl;
  config.auth = {
    token: result.token,
    deviceId: result.deviceId,
    label: result.label,
  };

  await saveConfig(config);

  const me = await apiRequest({
    config,
    path: "/api/cli/me",
  });

  console.log(`Signed in to ${appUrl} as ${me.user.email ?? me.user.name ?? "unknown user"}.`);
}

async function commandWhoAmI() {
  const config = await loadConfig();
  const me = await apiRequest({
    config,
    path: "/api/cli/me",
  });

  console.log(
    JSON.stringify(
      {
        appUrl: config.appUrl ?? null,
        authDeviceId: me.cli.currentDeviceId,
        user: me.user,
      },
      null,
      2,
    ),
  );
}

async function commandInstall(args) {
  const ide = getStringFlag(args, "ide");

  if (!ide) {
    throw new Error("Usage: incontext install --ide <codex|cursor|claude|all>");
  }

  const results = await installIdeMcpTargets(ide);
  const preview = getInstallCommandPreview();

  for (const result of results) {
    console.log(`Installed InContext MCP for ${result.ide} at ${result.path}`);

    if (result.ide === "codex") {
      console.log(preview.codex.section.trim());
    }
  }
}

async function commandUninstall(args) {
  const ide = getStringFlag(args, "ide");

  if (!ide) {
    throw new Error("Usage: incontext uninstall --ide <codex|cursor|claude|all>");
  }

  const results = await uninstallIdeMcpTargets(ide);

  for (const result of results) {
    console.log(`${result.removed ? "Removed" : "No InContext entry found for"} ${result.ide} (${result.path})`);
  }
}

async function commandProjects() {
  const config = await loadConfig();
  const result = await apiRequest({
    config,
    path: "/api/projects",
  });

  console.log(JSON.stringify(result.projects, null, 2));
}

async function commandStatus(args) {
  const status = await collectLocalStatus();

  if (args.flags.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  printStatus(status);
}

async function commandDoctor(args) {
  const result = await runDoctorChecks();

  if (args.flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printDoctor(result);
}

async function commandCurrent() {
  const config = await loadConfig();
  const active = config.activeProjectSlug ? findProjectState(config, config.activeProjectSlug) : null;

  console.log(
    JSON.stringify(
      {
        activeProjectSlug: config.activeProjectSlug ?? null,
        appUrl: config.appUrl ?? null,
        authDeviceId: config.auth?.deviceId ?? null,
        linkedProject: active,
        lastResumeHash: config.lastResumeHash ?? null,
      },
      null,
      2,
    ),
  );
}

async function commandProjectLink(args) {
  const projectSlug = args.positionals[2];

  if (!projectSlug) {
    throw new Error("Usage: incontext project link <project-slug>");
  }

  const config = await loadConfig();
  const repoRoot = await getGitRepoRoot(process.cwd());
  const branch = await getGitBranch(repoRoot);
  const repoRemoteUrl = await getGitRemoteUrl(repoRoot);

  const result = await apiRequest({
    config,
    path: "/api/cli/links",
    method: "POST",
    body: {
      projectSlug,
      repoRoot,
      repoRemoteUrl,
      branch,
    },
  });

  const nextConfig = upsertProjectState(config, {
    projectSlug: result.link.projectSlug,
    repoRoot: result.link.repoRoot,
    repoRemoteUrl: result.link.repoRemoteUrl ?? undefined,
    branch: result.link.branch ?? undefined,
    updatedAt: result.link.updatedAt,
  });

  nextConfig.activeProjectSlug = result.link.projectSlug;
  await saveConfig(nextConfig);

  console.log(`Linked ${repoRoot} to project ${result.link.projectName} (${result.link.projectSlug}).`);
}

async function commandHandoffSave(args) {
  const config = await loadConfig();
  const activeProjectSlug = getStringFlag(args, "project") ?? config.activeProjectSlug;

  if (!activeProjectSlug) {
    throw new Error("No active project. Run `incontext project link <project-slug>` first.");
  }

  const title = getStringFlag(args, "title");

  if (!title) {
    throw new Error("Provide a handoff title with --title.");
  }

  const projectState = findProjectState(config, activeProjectSlug);
  const repoRoot = projectState?.repoRoot ?? process.cwd();
  const branch = await getGitBranch(repoRoot).catch(() => projectState?.branch ?? "");
  const content = await readContentInput({
    content: getStringFlag(args, "content"),
    file: getStringFlag(args, "file"),
  });

  const result = await apiRequest({
    config,
    path: "/api/cli/resume-points",
    method: "POST",
    body: {
      projectSlug: activeProjectSlug,
      title,
      content,
      branch: branch || projectState?.branch,
      sourceSession: getStringFlag(args, "source-session"),
    },
  });

  const nextConfig = upsertProjectState(config, {
    projectSlug: result.resumePoint.projectSlug,
    repoRoot,
    repoRemoteUrl: projectState?.repoRemoteUrl,
    branch: result.resumePoint.branch ?? projectState?.branch,
    updatedAt: result.resumePoint.createdAt,
    lastResumeHash: result.resumePoint.hash,
  });

  nextConfig.activeProjectSlug = result.resumePoint.projectSlug;
  nextConfig.lastResumeHash = result.resumePoint.hash;
  await saveConfig(nextConfig);

  console.log(`Saved handoff ${result.resumePoint.hash} for ${result.resumePoint.projectName}.`);
  console.log(`Resume with: incontext resume ${result.resumePoint.hash}`);
}

async function commandResume(args) {
  const hash = args.positionals[1];

  if (!hash) {
    throw new Error("Usage: incontext resume <hash>");
  }

  const config = await loadConfig();
  const result = await apiRequest({
    config,
    path: `/api/cli/resume-points/${encodeURIComponent(hash)}`,
  });

  const projectState = findProjectState(config, result.resumePoint.project.slug);
  const nextConfig = {
    ...config,
    activeProjectSlug: result.resumePoint.project.slug,
    lastResumeHash: result.resumePoint.hash,
  };

  if (projectState) {
    const linked = upsertProjectState(nextConfig, {
      ...projectState,
      branch: result.resumePoint.branch ?? projectState.branch,
      lastResumeHash: result.resumePoint.hash,
      updatedAt: result.resumePoint.createdAt,
    });
    await saveConfig(linked);
  } else {
    await saveConfig(nextConfig);
  }

  console.log(`# ${result.resumePoint.project.name} (${result.resumePoint.project.slug})`);
  console.log(`Resume hash: ${result.resumePoint.hash}`);
  console.log(`Branch: ${result.resumePoint.branch ?? result.project?.defaultBranch ?? "unknown"}`);
  console.log("");
  console.log(result.resumePoint.title);
  console.log(result.resumePoint.content);

  const recentSummary = result.project?.summaries?.[0];

  if (recentSummary) {
    console.log("");
    console.log("Latest summary:");
    console.log(`${recentSummary.title}: ${recentSummary.content}`);
  }
}

async function commandMcpServe(args) {
  const { startLocalMcpServer } = await import("./mcp-server.mjs");
  const rawAgent = getStringFlag(args, "agent");
  const label = getStringFlag(args, "label");

  let agent = "CODEX";

  if (rawAgent) {
    const normalized = rawAgent.trim().toUpperCase();

    if (!["CODEX", "CLAUDE", "CURSOR", "OTHER"].includes(normalized)) {
      throw new Error("`--agent` must be one of: codex, claude, cursor, other.");
    }

    agent = normalized;
  }

  await startLocalMcpServer({
    agent,
    label,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command, subcommand] = args.positionals;

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "login") {
    await commandLogin(args);
    return;
  }

  if (command === "install") {
    await commandInstall(args);
    return;
  }

  if (command === "uninstall") {
    await commandUninstall(args);
    return;
  }

  if (command === "whoami") {
    await commandWhoAmI();
    return;
  }

  if (command === "status") {
    await commandStatus(args);
    return;
  }

  if (command === "doctor") {
    await commandDoctor(args);
    return;
  }

  if (command === "projects") {
    await commandProjects();
    return;
  }

  if (command === "current") {
    await commandCurrent();
    return;
  }

  if (command === "project" && subcommand === "link") {
    await commandProjectLink(args);
    return;
  }

  if (command === "handoff" && subcommand === "save") {
    await commandHandoffSave(args);
    return;
  }

  if (command === "resume") {
    await commandResume(args);
    return;
  }

  if (command === "mcp" && subcommand === "serve") {
    await commandMcpServe(args);
    return;
  }

  throw new Error(`Unknown command: ${args.positionals.join(" ")}`);
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
