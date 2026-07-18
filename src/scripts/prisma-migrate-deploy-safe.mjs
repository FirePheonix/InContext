import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const MAX_ATTEMPTS = Number(process.env.PRISMA_MIGRATE_DEPLOY_MAX_ATTEMPTS ?? "5");
const BASE_DELAY_MS = Number(process.env.PRISMA_MIGRATE_DEPLOY_BASE_DELAY_MS ?? "1500");
const MAX_DELAY_MS = Number(process.env.PRISMA_MIGRATE_DEPLOY_MAX_DELAY_MS ?? "10000");
const ROOT_DIR = fileURLToPath(new URL("../../", import.meta.url));
const NPM_EXEC = process.platform === "win32" ? "npm.cmd" : "npm";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAdvisoryLockTimeout(output) {
  return /P1002|advisory lock|Timed out trying to acquire a postgres advisory lock/i.test(output);
}

function runPrismaMigrateDeploy() {
  return new Promise((resolve, reject) => {
    const child = spawn(NPM_EXEC, ["exec", "--", "prisma", "migrate", "deploy"], {
      cwd: ROOT_DIR,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ output });
        return;
      }

      reject(new Error(output || `prisma migrate deploy exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await runPrismaMigrateDeploy();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry = attempt < MAX_ATTEMPTS && isAdvisoryLockTimeout(message);

      if (!shouldRetry) {
        throw error;
      }

      const delayMs = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (attempt - 1));
      console.warn(
        `[prisma:migrate] Advisory lock timeout on attempt ${attempt}/${MAX_ATTEMPTS}. Retrying in ${delayMs}ms.`,
      );
      await sleep(delayMs);
    }
  }
}

main().catch((error) => {
  console.error("[prisma:migrate] Migration failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
