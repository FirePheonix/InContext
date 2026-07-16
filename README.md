# InContext

InContext is a project-native memory and execution layer for coding agents. It gives Codex, Claude, Cursor, or any MCP-compatible client a shared project registry, portable summaries, architecture context, local resume hashes, local git-backed execution, and auditable commit history.

## What is implemented

- Google OAuth with Auth.js and Prisma
- GitHub OAuth support for browser and CLI login
- Multi-project registry with per-project ownership and memberships
- Prisma-backed dashboards for project context, infrastructure, and access scopes
- Project APIs for listing projects, reading context, creating summaries, and queueing commit intents
- MCP stdio server with project/context tools
- Direct local git commit execution for queued intents, gated by env flags and per-project settings
- Local `incontext` CLI with browser login, project linking, handoff save, resume hashes, and local MCP mode

## Stack

- Next.js 16
- React 19
- Prisma 7 + PostgreSQL
- Auth.js / NextAuth v5 beta
- shadcn/ui
- MCP TypeScript SDK

## Local setup

1. Install dependencies

```bash
npm install
```

2. Copy envs

```bash
Copy-Item .env.example .env
```

3. Run Prisma migration if needed

```bash
npm run db:migrate
```

4. Start the app

```bash
npm run dev
```

5. Start the MCP server in another terminal when needed

```bash
npm run mcp:server
```

6. Or use the local CLI-first workflow

```bash
npm run cli -- help
```

7. For a global developer install of the command from this repo

```bash
npm run cli:link
incontext help
```

8. Or run the deployable MCP HTTP server

```bash
npm run mcp:http
```

## Required envs

Put these in `.env`:

```dotenv
DATABASE_URL="postgresql://app_user:app_password@your-pooled-host/incontext?schema=public"
DIRECT_URL="postgresql://app_user:app_password@your-direct-host/incontext?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_GITHUB_ID="your-github-oauth-client-id"
AUTH_GITHUB_SECRET="your-github-oauth-client-secret"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
AUTH_TRUST_HOST="true"
DIRECT_GIT_COMMITS_ENABLED="false"
GIT_PROJECTS_ROOT="E:\\context-git"
MCP_PORT="8787"
MCP_AUTH_TOKEN=""
MCP_ALLOWED_ORIGINS=""
```

Use:

- `DATABASE_URL` for the app runtime connection
- `DIRECT_URL` for Prisma CLI and migrations when your provider gives you a separate direct connection

If your provider only gives you one PostgreSQL URL, you can set both values to the same connection string.

## OAuth setup

Use a GitHub or Google OAuth app.

Google callback:

```text
http://localhost:3000/api/auth/callback/google
```

GitHub callback:

```text
http://localhost:3000/api/auth/callback/github
```

If you deploy this, use the deployed host with the same callback paths.

## CLI workflow

The preferred individual-user workflow is:

1. Login from terminal:

```bash
npm run cli -- login --app-url https://your-vercel-domain
```

2. Link the current repo:

```bash
incontext project link your-project-slug
```

3. Save a handoff:

```bash
incontext handoff save --title "Session handoff" --content "..."
```

4. Resume later:

```bash
incontext resume <hash>
```

5. Start the local MCP bridge for agents:

```bash
incontext mcp serve
```

See [CLI.md](./CLI.md) for the full local workflow.

The CLI source and package metadata live in [packages/cli](./packages/cli). That package is shaped for future `npx @incontext/cli ...` usage, while repo-local development uses `npm run cli -- ...` or `npm run cli:link`.

## MCP server

The local stdio MCP entrypoint is:

```text
src/mcp/server.ts
```

The deployable HTTP MCP entrypoint is:

```text
src/mcp/http-server.ts
```

Available MCP capabilities:

- `list_projects`
- `get_project_detail`
- `get_project_context`
- `create_project`
- `add_project_summary`
- `queue_commit_intent`
- `execute_commit_intent`

The local `incontext mcp serve` command also exposes:

- `get_current_project`
- `resume_project`
- `add_handoff`
- `update_progress`
- `record_decision`
- `commit_and_push`

It also exposes:

- resource: `incontext://projects`
- prompt: `project-handoff`

For public or semi-public HTTP deployment, set:

- `MCP_AUTH_TOKEN` to require `Authorization: Bearer <token>`
- `MCP_ALLOWED_ORIGINS` to a comma-separated allowlist such as `https://your-app.vercel.app,https://your-domain.com`

## Project APIs

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/[slug]`
- `GET /api/projects/[slug]/context`
- `POST /api/projects/[slug]/summaries`
- `POST /api/projects/[slug]/commits`
- `POST /api/projects/[slug]/commits/[commitId]/execute`

All project APIs now require an authenticated session.

## Direct commit bridge

Queued commit intents can be executed against a local repository only when all of these are true:

- `DIRECT_GIT_COMMITS_ENABLED="true"`
- `GIT_PROJECTS_ROOT` is set
- the project has `repoLocalPath`
- the project has `directCommitEnabled = true`
- the queued intent targets the branch currently checked out in that repo
- the queued intent includes explicit relative file paths

This is intentionally strict. It is designed to be auditable and harder to misuse.

## Deployment

Recommended production split:

1. Vercel for the frontend app
2. Railway for the optional hosted MCP HTTP server
3. Neon for PostgreSQL

Both deployments should share the same PostgreSQL database.

Deploy both services from the repository root. Do not configure either platform to use a `frontend/` subdirectory.

See [DEPLOY.md](./DEPLOY.md) for the full Vercel + Railway setup.

## Vercel build

This repo includes:

```text
postinstall = prisma generate
vercel-build = prisma generate && prisma migrate deploy && next build
```

## Current limitations

- Token storage is scaffold-level, not production-grade secret vaulting
- Direct commit execution is local-repo only, not remote GitHub push/PR automation
- Password auth is still placeholder-only
- Approval UI for queued commit execution is not built yet

## Useful commands

```bash
npm run dev
npm run build
npm run db:migrate
npm run db:generate
npm run db:studio
npm run mcp:server
```
