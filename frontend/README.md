# Context Hub

Context Hub is a project-native memory and execution layer for coding agents. It gives Codex, Claude, Cursor, or any MCP-compatible client a shared project registry, portable summaries, architecture context, scoped write access, and auditable commit intents.

## What is implemented

- Google OAuth with Auth.js and Prisma
- Multi-project registry with per-project ownership and memberships
- Prisma-backed dashboards for project context, infrastructure, and access scopes
- Project APIs for listing projects, reading context, creating summaries, and queueing commit intents
- MCP stdio server with project/context tools
- Direct local git commit execution for queued intents, gated by env flags and per-project settings

## Stack

- Next.js 16
- React 19
- Prisma 7 + SQLite
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

6. Or run the deployable MCP HTTP server

```bash
npm run mcp:http
```

## Required envs

Put these in `frontend/.env`:

```dotenv
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
AUTH_TRUST_HOST="true"
DIRECT_GIT_COMMITS_ENABLED="false"
GIT_PROJECTS_ROOT="E:\\context-git"
MCP_PORT="8787"
```

## Google OAuth setup

Use a Google OAuth web app and add this callback URL:

```text
http://localhost:3000/api/auth/callback/google
```

If you deploy this, use the deployed host with the same callback path.

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

It also exposes:

- resource: `contexthub://projects`
- prompt: `project-handoff`

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

## Recommended deployment layout

Use two deployments:

1. Frontend app
   Deploy the Next.js app to Vercel.

2. MCP + git bridge service
   Deploy the HTTP MCP server on a long-running Node host where git is installed and local repos can exist on disk.

Good examples are Railway, Render, Fly.io, or your own VPS.

The frontend and the MCP server should share the same database.

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
