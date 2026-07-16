import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

async function runGit(args) {
  const { stdout } = await execFile("git", args, {
    windowsHide: true,
  });

  return stdout.trim();
}

export async function getGitRepoRoot(cwd = process.cwd()) {
  return runGit(["-C", cwd, "rev-parse", "--show-toplevel"]);
}

export async function getGitBranch(cwd = process.cwd()) {
  return runGit(["-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"]);
}

export async function getGitRemoteUrl(cwd = process.cwd()) {
  try {
    return await runGit(["-C", cwd, "remote", "get-url", "origin"]);
  } catch {
    return "";
  }
}
