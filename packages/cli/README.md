# incontext-cli

Local CLI and MCP bridge for InContext.

## Install

Repo-local during development:

```bash
npm install
npm run cli -- help
```

Developer-friendly global command from this repo:

```bash
npm run cli:link
incontext help
```

Future published usage:

```bash
npx incontext-cli help
```

Global install from npm:

```bash
npm install -g incontext-cli
incontext help
```

## Core commands

```bash
incontext login --app-url https://your-vercel-domain
incontext whoami
incontext projects
incontext current
incontext project link <project-slug>
incontext handoff save --title "..." --content "..."
incontext resume <hash>
incontext mcp serve
```

## Agent workflow

1. Login once through the browser-assisted CLI flow.
2. Link the current repo to a project.
3. Save handoffs and resume via hashes.
4. Start `incontext mcp serve`.
5. Point Codex, Claude, Cursor, or another stdio MCP client at the local process.

The project workspace model is:

- one project
- multiple agent nodes
- one shared notebook
- one activity log showing who updated the shared state

## Copyable MCP config

Use this for Codex, Claude Code, or Cursor:

```json
{
  "mcpServers": {
    "incontext": {
      "command": "npx",
      "args": ["incontext-cli", "mcp", "serve"]
    }
  }
}
```

If installed globally:

```json
{
  "mcpServers": {
    "incontext": {
      "command": "incontext",
      "args": ["mcp", "serve"]
    }
  }
}
```
