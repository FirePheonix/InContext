# Contributing to InContext

InContext is a shared project memory and execution layer for coding agents. The product combines a Next.js workspace UI, Prisma-backed project state, Auth.js authentication, MCP server entrypoints, and a guarded local git execution bridge.

## What contributors are working on

- Multi-project context storage for summaries, architecture notes, agent connections, and commit history
- Cross-agent access through MCP tools and resources
- Scoped write paths for repo-linked projects
- Dashboard surfaces for project health, handoffs, and access control

## Local setup

1. Install dependencies.

```bash
npm install
```

2. Create your local env file.

```bash
Copy-Item .env.example .env
```

3. Fill in the required envs in `.env`.

4. Apply the Prisma migration.

```bash
npm run db:migrate
```

5. Start the app.

```bash
npm run dev
```

6. Start the MCP server in a second terminal when you need agent integration.

```bash
npm run mcp:server
```

7. For HTTP transport testing, run the MCP HTTP server.

```bash
npm run mcp:http
```

## Project structure

```text
src/
  app/
    (external)/            public entry route
    (main)/auth/           login and register flows
    (main)/dashboard/      project context, architecture, access, and workspace screens
    api/                   Auth.js, project APIs, and commit execution APIs
  components/              shared UI primitives and wrappers
  config/                  app metadata and runtime-safe config
  lib/                     Prisma access, project services, auth helpers, git bridge
  mcp/                     stdio and HTTP MCP server entrypoints
  navigation/              sidebar and shell navigation definitions
  server/                  server actions and preference handling
  types/                   shared type augmentation
prisma/
  schema.prisma            PostgreSQL data model for users, projects, summaries, tokens, and commits
```

## Contribution workflow

1. Create a branch.

```bash
git checkout -b feat/your-change
```

2. Make a focused change.

3. Run the build before committing.

```bash
npm run build
```

4. Commit with a scoped message.

```bash
git commit -m "feat(context): add project handoff filters"
```

5. Open a pull request with screenshots for UI changes and notes for schema or env changes.

## Engineering guidelines

- Prefer focused commits over large mixed changes.
- Keep project data scoped by authenticated user and membership.
- Treat git execution and token-related code as security-sensitive.
- Prefer TypeScript types over `any`.
- Reuse existing UI components and shell structure instead of rebuilding the dashboard layout.
- Keep comments short and only where the code would otherwise be unclear.
- Validate API and MCP changes against the current Prisma models.

## Verification checklist

- `npm run build` passes
- Prisma schema and generated client stay in sync
- New env requirements are reflected in `.env.example` and `README.md`
- UI wording reflects InContext, not the original dashboard template

## Notes on direct git execution

`DIRECT_GIT_COMMITS_ENABLED` should stay disabled by default. Any change touching the direct commit bridge should preserve:

- explicit per-project opt-in
- path validation under `GIT_PROJECTS_ROOT`
- branch checks
- auditable queued commit records

## Support

Use the repository issue tracker or PR discussion for bugs, design changes, or deployment questions.
