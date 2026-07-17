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
incontext install --ide codex
incontext uninstall --ide codex
incontext login --app-url https://your-vercel-domain
incontext whoami
incontext status
incontext doctor
incontext view
incontext projects
incontext current
incontext project link <project-slug>
incontext capture --title "..." --content "..."
incontext observations
incontext observation promote <id>
incontext handoff save --title "..." --content "..."
incontext resume <hash>
incontext export --output ./project.json
incontext import --file ./project.json
incontext mcp serve
incontext mcp serve --allow-project-create
```

## Agent workflow

1. Login once through the browser-assisted CLI flow.
2. Link the current repo to a project.
3. Save handoffs and resume via hashes.
4. Start `incontext mcp serve`.
5. Point Codex, Claude, Cursor, or another stdio MCP client at the local process.

Use `--allow-project-create` only when you want that local agent session to create a missing project instead of failing closed.

## One-command IDE setup

```bash
incontext install --ide codex
incontext install --ide cursor
incontext install --ide claude
incontext install --ide all
```

Remove the MCP wiring later:

```bash
incontext uninstall --ide codex
```

Inspect local health:

```bash
incontext status
incontext doctor
```

The project workspace model is:

- one project
- multiple agent nodes
- one shared notebook
- one activity log showing who updated the shared state

The local MCP server now supports progressive retrieval, not just full-context loads:

- `search_project_memory`
- `timeline_project_activity`
- `get_context_entries`

It also supports draft capture into project-scoped observations:

- `capture_project_observation`
- `list_project_observations`
- `promote_project_observation`

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
