# Deploy InContext

InContext can run in two modes:

- local CLI + local MCP for individual-user workflows
- Vercel + Railway + Neon for hosted app plus optional hosted HTTP MCP

Hosted deployment from this repository root is:

- Vercel runs the Next.js app
- Railway runs the optional MCP HTTP server
- Neon provides the shared PostgreSQL database

Do not set a nested root directory on either platform. The repository root is the app root.

## 1. Neon

Create a Neon database and copy both Postgres URLs:

- pooled/runtime URL
- direct/migration URL

Map them like this:

```dotenv
DATABASE_URL="your_neon_pooled_url"
DIRECT_URL="your_neon_direct_url"
```

## 2. Vercel frontend

Create a Vercel project from this repository.

Use the repository root as the project root. Do not point Vercel at `frontend/`.

`vercel.json` is already included and sets:

```text
Install Command: npm install
Build Command: npm run vercel-build
```

Set these environment variables in Vercel:

```dotenv
DATABASE_URL="your_neon_pooled_url"
DIRECT_URL="your_neon_direct_url"
AUTH_SECRET="your-auth-secret"
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
AUTH_TRUST_HOST="true"
DIRECT_GIT_COMMITS_ENABLED="false"
```

`npm run vercel-build` runs:

```text
prisma generate && prisma migrate deploy && next build
```

## 3. OAuth providers

GitHub OAuth callback:

```text
https://your-vercel-domain/api/auth/callback/github
```

Google OAuth callback:

```text
https://your-vercel-domain/api/auth/callback/google
```

## 4. Railway MCP service

Create a Railway service from the same repository.

Use the repository root as the service root. Do not point Railway at `frontend/`.

`railway.json` is already included and sets the MCP server start command:

```text
Build: npm install
Start: npm run mcp:http
```

The repo also pins Node 22 for Railway via `package.json`, `.nvmrc`, and `nixpacks.toml`.

Set these environment variables in Railway:

```dotenv
DATABASE_URL="your_neon_pooled_url"
MCP_AUTH_TOKEN="generate-a-long-random-token"
MCP_ALLOWED_ORIGINS="https://your-vercel-domain"
DIRECT_GIT_COMMITS_ENABLED="false"
```

Do not put `MCP_AUTH_TOKEN` into a Dockerfile, `ARG`, or checked-in config file. Keep it as a Railway service variable only.

Optional:

```dotenv
MCP_PORT="8787"
```

`MCP_PORT` is optional because the HTTP MCP server already falls back to Railway's `PORT`.

## 5. MCP endpoints

After Railway deploys, the service exposes:

```text
GET  /health
POST /mcp
```

If `MCP_AUTH_TOKEN` is set, callers must send:

```http
Authorization: Bearer YOUR_MCP_AUTH_TOKEN
```

## 6. Direct git execution

Leave direct repo writes disabled in cloud unless you have explicitly provisioned:

- git on the MCP host
- checked-out repositories on disk
- a valid `GIT_PROJECTS_ROOT`

Default:

```dotenv
DIRECT_GIT_COMMITS_ENABLED="false"
```

The hosted MCP service is optional. Individual-user workflows should prefer the local CLI command:

```bash
npm run cli -- mcp serve
```

That local MCP server reads hosted project context but executes git on the user's own machine.

## 7. Deployment order

1. Create the Neon database.
2. Add Vercel environment variables.
3. Deploy the Vercel app.
4. Add the Vercel callback URI in GitHub and/or Google OAuth.
5. Add Railway environment variables.
6. Deploy the Railway MCP service.
7. Test browser sign-in on the Vercel domain.
8. Test Railway `/health`.
9. Test an authenticated MCP request to Railway `/mcp`.

## 8. Post-deploy checks

- Google login works on the Vercel domain
- `/dashboard/overview` loads data
- authenticated project APIs respond
- Railway `/health` returns `{ "ok": true }`
- MCP clients can call Railway with the bearer token
