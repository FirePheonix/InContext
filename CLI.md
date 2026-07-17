# InContext CLI

The local CLI is the primary workflow for an individual user. It stores the active project on the machine, opens browser login against the hosted app, and runs a local MCP server for Codex, Claude, Cursor, or any stdio MCP client.

The CLI package now lives in [packages/cli](./packages/cli) and is published on npm as `incontext-cli`.

## Install

Repo-local use during development:

```bash
npm install
npm run cli -- help
```

Install the `incontext` command globally from this repo for development:

```bash
npm run cli:link
incontext help
```

Future publishable / agent-friendly shape:

```bash
npx incontext-cli help
```

Global install from npm:

```bash
npm install -g incontext-cli
incontext help
```

## Commands

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
```

## Typical flow

1. Login from the terminal.

```bash
npm run cli -- login --app-url https://your-vercel-domain
```

This opens:

```text
https://your-vercel-domain/cli/authorize
```

After browser sign-in, the CLI stores local state at:

```text
~/.incontext/config.json
```

2. Link the current repo to a project.

```bash
incontext project link your-project-slug
```

This records the local repo root, branch, and remote URL, and sets the project as active on the machine.

3. Save a handoff or progress snapshot.

```bash
incontext handoff save --title "Session handoff" --content "What changed, what is next, and open issues."
```

This creates:

- a pinned handoff summary in the hosted app
- a short resume hash

4. Resume later from any terminal on the same machine.

```bash
incontext resume abc123def0
```

This restores the active project locally and prints the saved handoff plus recent context.

5. Start the local MCP server for agents.

```bash
incontext mcp serve
```

## Copyable MCP configs

Use this for Codex, Claude Code, or Cursor with `npx`:

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

If `incontext-cli` is installed globally:

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

Recommended first-run sequence:

```bash
npx incontext-cli install --ide codex
npx incontext-cli login --app-url https://your-vercel-domain
npx incontext-cli projects
npx incontext-cli project link <your-project-slug>
npx incontext-cli status
npx incontext-cli mcp serve
```

## IDE install flow

Wire InContext into Codex, Cursor, or Claude Code without manually editing config files:

```bash
incontext install --ide codex
incontext install --ide cursor
incontext install --ide claude
incontext install --ide all
```

Remove the local MCP wiring:

```bash
incontext uninstall --ide codex
```

Inspect local health:

```bash
incontext status
incontext doctor
incontext doctor --json
```

## Capture, view, and portability

Capture draft observations without editing the notebook immediately:

```bash
incontext capture --title "Repo insight" --content "The auth callback flow is already stable, but the MCP auth path is still shared-token based."
incontext observations --status DRAFT
incontext observation promote <observation-id>
```

Open a read-only terminal viewer for the current project:

```bash
incontext view
incontext view --json
```

Export or import a project snapshot:

```bash
incontext export --project your-project-slug --output ./your-project.json
incontext import --file ./your-project.json --mode new
```

## Local MCP tools

The local MCP server exposes:

- `create_project`
- `get_current_project`
- `list_projects`
- `get_project_context`
- `get_project_workspace`
- `search_project_memory`
- `timeline_project_activity`
- `get_context_entries`
- `capture_project_observation`
- `list_project_observations`
- `promote_project_observation`
- `register_project_agent`
- `update_shared_notebook`
- `resume_project`
- `add_handoff`
- `update_progress`
- `record_decision`
- `commit_and_push`

Each project workspace now supports:

- multiple agent nodes
- one shared project notebook
- activity logs for notebook edits and agent updates
- project edit/delete operations through the web UI

The local MCP process uses:

- the hosted app for project context and summaries
- the machine's local git checkout for commit and push

## Git behavior

`commit_and_push` runs against the linked local repo and uses the machine's own git authentication, such as:

- Git Credential Manager
- GitHub CLI auth
- SSH keys

It does not rely on Railway to push code.

## Notes

- The local CLI is the preferred individual-user workflow.
- The hosted Railway MCP endpoint is optional and remains useful for remote or shared HTTP MCP access.
- Local CLI state is separate from the browser session and is backed by a dedicated CLI token issued by the app.
