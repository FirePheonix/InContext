import { prisma } from "@/lib/prisma";

import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

function assertDirectCommitsEnabled() {
  if (process.env.DIRECT_GIT_COMMITS_ENABLED !== "true") {
    throw new Error("Direct git commits are disabled. Set DIRECT_GIT_COMMITS_ENABLED=true to enable execution.");
  }
}

function getAllowedRoot() {
  const allowedRoot = process.env.GIT_PROJECTS_ROOT?.trim();

  if (!allowedRoot) {
    throw new Error("GIT_PROJECTS_ROOT is required before executing commit intents.");
  }

  return path.resolve(allowedRoot);
}

function validateRelativeFiles(files: string[]) {
  if (files.length === 0) {
    throw new Error("Commit intent execution requires at least one file path.");
  }

  return files.map((file) => {
    const normalized = path.normalize(file).replace(/\\/g, "/");

    if (path.isAbsolute(normalized) || normalized.startsWith("../") || normalized === "..") {
      throw new Error(`Unsafe file path '${file}'.`);
    }

    return normalized;
  });
}

async function runGit(repoPath: string, args: string[]) {
  const { stdout } = await execFile("git", ["-C", repoPath, ...args], {
    windowsHide: true,
  });

  return stdout.trim();
}

export async function executeCommitIntent(slug: string, commitId: string, actorId?: string) {
  assertDirectCommitsEnabled();

  const commit = await prisma.commitLog.findFirst({
    where: {
      id: commitId,
      project: {
        slug,
        ...(actorId
          ? {
              OR: [{ createdById: actorId }, { memberships: { some: { userId: actorId } } }],
            }
          : {}),
      },
    },
    include: {
      project: true,
    },
  });

  if (!commit) {
    throw new Error("Commit intent not found.");
  }

  if (commit.status !== "QUEUED") {
    throw new Error("Only queued commit intents can be executed.");
  }

  if (!commit.project.directCommitEnabled) {
    throw new Error("Direct commits are disabled for this project.");
  }

  if (!commit.project.repoLocalPath) {
    throw new Error("Project repoLocalPath is not configured.");
  }

  const allowedRoot = getAllowedRoot();
  const repoPath = path.resolve(commit.project.repoLocalPath);

  if (!repoPath.startsWith(allowedRoot)) {
    throw new Error("Configured repo path is outside the allowed git root.");
  }

  const files = validateRelativeFiles(JSON.parse(commit.filesJson ?? "[]") as string[]);

  try {
    const activeBranch = await runGit(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);

    if (activeBranch !== commit.branch) {
      throw new Error(`Active branch is '${activeBranch}', but commit intent targets '${commit.branch}'.`);
    }

    await runGit(repoPath, ["add", "--", ...files]);
    await runGit(repoPath, ["commit", "--no-verify", "-m", commit.message]);
    const sha = await runGit(repoPath, ["rev-parse", "HEAD"]);

    return prisma.commitLog.update({
      where: { id: commit.id },
      data: {
        status: "SUCCEEDED",
        commitSha: sha,
        errorMessage: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Git execution failed.";

    await prisma.commitLog.update({
      where: { id: commit.id },
      data: {
        status: "FAILED",
        errorMessage: message,
      },
    });

    throw new Error(message);
  }
}
