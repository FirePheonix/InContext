import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Context Hub",
  version: packageJson.version,
  copyright: `© ${currentYear}, Context Hub.`,
  meta: {
    title: "Context Hub - Cross-Agent Project Memory and Architecture Console",
    description:
      "Context Hub is a dashboard for shared AI project memory. Track project summaries, session recall, architecture sources, and git-backed write access across Codex, Claude, Cursor, and other MCP clients.",
  },
};
