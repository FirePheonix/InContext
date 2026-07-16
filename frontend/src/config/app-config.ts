import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "InContext",
  version: packageJson.version,
  copyright: `Copyright ${currentYear} InContext.`,
  meta: {
    title: "InContext - Cross-Agent Project Memory and Architecture Console",
    description:
      "InContext is a shared project memory and execution console. Track project summaries, session handoffs, architecture sources, and git-backed write access across Codex, Claude, Cursor, and other MCP clients.",
  },
};
