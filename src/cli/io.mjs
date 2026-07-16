import { readFile } from "node:fs/promises";

export async function readContentInput(options) {
  if (options.content?.trim()) {
    return options.content.trim();
  }

  if (options.file?.trim()) {
    return (await readFile(options.file, "utf8")).trim();
  }

  if (!process.stdin.isTTY) {
    const chunks = [];

    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString("utf8").trim();
  }

  throw new Error("Provide content with --content, --file, or stdin.");
}
