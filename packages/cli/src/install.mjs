import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const MCP_SERVER_NAME = "incontext";
const DEFAULT_COMMAND = "npx";
const DEFAULT_ARGS = ["incontext-cli", "mcp", "serve"];
const SUPPORTED_IDES = ["claude", "codex", "cursor"];

function getCodexConfigPath() {
  return path.join(os.homedir(), ".codex", "config.toml");
}

function getCursorConfigPath() {
  return path.join(os.homedir(), ".cursor", "mcp.json");
}

function getClaudeConfigPath() {
  return path.join(os.homedir(), ".claude.json");
}

async function readText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

async function readJson(filePath) {
  const raw = await readText(filePath);

  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw);
}

async function ensureParentDirectory(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

function stripTomlSection(content, header) {
  const lines = content.split(/\r?\n/);
  const kept = [];
  let skipping = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === header) {
      skipping = true;
      continue;
    }

    if (skipping && trimmed.startsWith("[") && trimmed.endsWith("]")) {
      skipping = false;
    }

    if (!skipping) {
      kept.push(line);
    }
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function upsertTomlSection(content, header, bodyLines) {
  const stripped = stripTomlSection(content, header);
  const block = [header, ...bodyLines].join("\n");

  return stripped ? `${stripped}\n\n${block}\n` : `${block}\n`;
}

async function writeJson(filePath, value) {
  await ensureParentDirectory(filePath);
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildJsonMcpServer() {
  return {
    command: DEFAULT_COMMAND,
    args: [...DEFAULT_ARGS],
  };
}

function buildCodexTomlSection() {
  return upsertTomlSection("", "[mcp_servers.incontext]", [
    `command = "${DEFAULT_COMMAND}"`,
    `args = ["${DEFAULT_ARGS.join('", "')}"]`,
  ]);
}

async function installCodexConfig() {
  const configPath = getCodexConfigPath();
  const existing = await readText(configPath);
  const next = upsertTomlSection(existing, "[mcp_servers.incontext]", [
    `command = "${DEFAULT_COMMAND}"`,
    `args = ["${DEFAULT_ARGS.join('", "')}"]`,
  ]);

  await ensureParentDirectory(configPath);
  await writeFile(configPath, next, "utf8");

  return { ide: "codex", path: configPath };
}

async function uninstallCodexConfig() {
  const configPath = getCodexConfigPath();
  const existing = await readText(configPath);

  if (!existing.trim()) {
    return { ide: "codex", path: configPath, removed: false };
  }

  const next = stripTomlSection(existing, "[mcp_servers.incontext]");
  await ensureParentDirectory(configPath);
  await writeFile(configPath, next ? `${next}\n` : "", "utf8");

  return { ide: "codex", path: configPath, removed: next !== existing.trim() };
}

async function installCursorConfig() {
  const configPath = getCursorConfigPath();
  const json = await readJson(configPath);
  const next = {
    ...json,
    mcpServers: {
      ...(json.mcpServers ?? {}),
      [MCP_SERVER_NAME]: buildJsonMcpServer(),
    },
  };

  await writeJson(configPath, next);
  return { ide: "cursor", path: configPath };
}

async function uninstallCursorConfig() {
  const configPath = getCursorConfigPath();
  const json = await readJson(configPath);

  if (!json.mcpServers?.[MCP_SERVER_NAME]) {
    return { ide: "cursor", path: configPath, removed: false };
  }

  const nextServers = { ...json.mcpServers };
  delete nextServers[MCP_SERVER_NAME];
  const next = {
    ...json,
    mcpServers: nextServers,
  };

  await writeJson(configPath, next);
  return { ide: "cursor", path: configPath, removed: true };
}

async function installClaudeConfig() {
  const configPath = getClaudeConfigPath();
  const json = await readJson(configPath);
  const next = {
    ...json,
    mcpServers: {
      ...(json.mcpServers ?? {}),
      [MCP_SERVER_NAME]: {
        type: "stdio",
        ...buildJsonMcpServer(),
        env: {},
      },
    },
  };

  await writeJson(configPath, next);
  return { ide: "claude", path: configPath };
}

async function uninstallClaudeConfig() {
  const configPath = getClaudeConfigPath();
  const json = await readJson(configPath);

  if (!json.mcpServers?.[MCP_SERVER_NAME]) {
    return { ide: "claude", path: configPath, removed: false };
  }

  const nextServers = { ...json.mcpServers };
  delete nextServers[MCP_SERVER_NAME];
  const next = {
    ...json,
    mcpServers: nextServers,
  };

  await writeJson(configPath, next);
  return { ide: "claude", path: configPath, removed: true };
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function inspectCodexConfig() {
  const configPath = getCodexConfigPath();
  const exists = await pathExists(configPath);
  const content = exists ? await readText(configPath) : "";

  return {
    ide: "codex",
    path: configPath,
    exists,
    installed: content.includes("[mcp_servers.incontext]"),
    command: "npx incontext-cli mcp serve",
  };
}

async function inspectCursorConfig() {
  const configPath = getCursorConfigPath();
  const exists = await pathExists(configPath);
  const json = exists ? await readJson(configPath) : {};

  return {
    ide: "cursor",
    path: configPath,
    exists,
    installed: Boolean(json.mcpServers?.[MCP_SERVER_NAME]),
    command: "npx incontext-cli mcp serve",
  };
}

async function inspectClaudeConfig() {
  const configPath = getClaudeConfigPath();
  const exists = await pathExists(configPath);
  const json = exists ? await readJson(configPath) : {};

  return {
    ide: "claude",
    path: configPath,
    exists,
    installed: Boolean(json.mcpServers?.[MCP_SERVER_NAME]),
    command: "npx incontext-cli mcp serve",
  };
}

export function resolveIdeTargets(rawIde) {
  if (!rawIde || rawIde === "all") {
    return [...SUPPORTED_IDES];
  }

  const ide = rawIde.trim().toLowerCase();

  if (!SUPPORTED_IDES.includes(ide)) {
    throw new Error("`--ide` must be one of: codex, cursor, claude, all.");
  }

  return [ide];
}

export async function installIdeMcpTargets(rawIde) {
  const targets = resolveIdeTargets(rawIde);
  const results = [];

  for (const target of targets) {
    if (target === "codex") {
      results.push(await installCodexConfig());
    }

    if (target === "cursor") {
      results.push(await installCursorConfig());
    }

    if (target === "claude") {
      results.push(await installClaudeConfig());
    }
  }

  return results;
}

export async function uninstallIdeMcpTargets(rawIde) {
  const targets = resolveIdeTargets(rawIde);
  const results = [];

  for (const target of targets) {
    if (target === "codex") {
      results.push(await uninstallCodexConfig());
    }

    if (target === "cursor") {
      results.push(await uninstallCursorConfig());
    }

    if (target === "claude") {
      results.push(await uninstallClaudeConfig());
    }
  }

  return results;
}

export async function inspectIdeInstallations() {
  return Promise.all([inspectCodexConfig(), inspectCursorConfig(), inspectClaudeConfig()]);
}

export function getInstallCommandPreview() {
  return {
    codex: {
      path: getCodexConfigPath(),
      section: buildCodexTomlSection(),
    },
    cursor: {
      path: getCursorConfigPath(),
      json: {
        mcpServers: {
          [MCP_SERVER_NAME]: buildJsonMcpServer(),
        },
      },
    },
    claude: {
      path: getClaudeConfigPath(),
      json: {
        mcpServers: {
          [MCP_SERVER_NAME]: {
            type: "stdio",
            ...buildJsonMcpServer(),
            env: {},
          },
        },
      },
    },
  };
}
