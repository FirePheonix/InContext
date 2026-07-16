import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

function validateFiles(files) {
  if (!files) {
    return [];
  }

  return files.map((file) => {
    const normalized = path.normalize(file).replace(/\\/g, "/");

    if (path.isAbsolute(normalized) || normalized.startsWith("../") || normalized === "..") {
      throw new Error(`Unsafe file path '${file}'.`);
    }

    return normalized;
  });
}

async function runGit(repoRoot, args) {
  const { stdout } = await execFile("git", ["-C", repoRoot, ...args], {
    windowsHide: true,
  });

  return stdout.trim();
}

export async function commitAndPushLinkedRepo({ repoRoot, branch, message, files, push = true }) {
  const normalizedFiles = validateFiles(files);

  if (normalizedFiles.length > 0) {
    await runGit(repoRoot, ["add", "--", ...normalizedFiles]);
  } else {
    await runGit(repoRoot, ["add", "-A"]);
  }

  await runGit(repoRoot, ["commit", "-m", message]);
  const commitSha = await runGit(repoRoot, ["rev-parse", "HEAD"]);

  if (push) {
    await runGit(repoRoot, ["push", "origin", branch]);
  }

  return {
    branch,
    commitSha,
    files: normalizedFiles,
    pushed: push,
  };
}
