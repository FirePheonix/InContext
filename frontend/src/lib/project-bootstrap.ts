import { subDays, subHours, subMinutes } from "date-fns";

import { prisma } from "@/lib/prisma";

const DEFAULT_OWNER_EMAIL = "owner@incontext.local";
const DEFAULT_OWNER_NAME = "InContext Owner";

const seededUsers = [
  { email: DEFAULT_OWNER_EMAIL, name: DEFAULT_OWNER_NAME },
  { email: "platform@incontext.local", name: "Platform Team" },
  { email: "security@incontext.local", name: "Security Team" },
  { email: "ops@incontext.local", name: "Operations Team" },
] as const;

type SeedProject = {
  architecturePath: string;
  contextPath: string;
  directCommitEnabled?: boolean;
  defaultBranch: string;
  description: string;
  documents: Array<{
    checksum: string;
    content: string;
    kind: "ARCHITECTURE" | "DATA_MODEL" | "OVERVIEW" | "RUNBOOK";
    lastIndexedAt: Date;
    path: string;
    title: string;
  }>;
  members: string[];
  name: string;
  repoLocalPath?: string;
  repoUrl: string;
  status: "ACTIVE" | "DRAFT" | "PAUSED";
  slug: string;
  summaries: Array<{
    content: string;
    isPinned?: boolean;
    kind: "DECISION" | "GOAL" | "HANDOFF" | "PROGRESS";
    sourceSession?: string;
    title: string;
  }>;
  tokens: Array<{
    expiresAt?: Date;
    kind: "GITHUB_APP" | "PERSONAL_ACCESS_TOKEN" | "SERVICE_ACCOUNT";
    label: string;
    lastUsedAt?: Date;
    ownerEmail: string;
    provider: string;
    revokedAt?: Date;
    scopes: string;
  }>;
  agents: Array<{
    agent: "CLAUDE" | "CODEX" | "CURSOR" | "OTHER";
    configJson?: string;
    label: string;
    lastSyncedAt?: Date;
    userEmail?: string;
  }>;
  commits: Array<{
    actorEmail?: string;
    branch: string;
    commitSha?: string;
    errorMessage?: string;
    filesJson?: string;
    message: string;
    pullRequestUrl?: string;
    status: "FAILED" | "QUEUED" | "SUCCEEDED";
    tokenLabel?: string;
  }>;
};

const seedProjects: SeedProject[] = [
  {
    name: "frontend-dashboard",
    slug: "frontend-dashboard",
    description: "Shared memory UI for project summaries, handoffs, and architecture context.",
    status: "ACTIVE",
    repoUrl: "https://github.com/org/frontend-dashboard",
    repoLocalPath: process.cwd(),
    defaultBranch: "main",
    directCommitEnabled: true,
    contextPath: "memory/frontend-dashboard",
    architecturePath: "docs/architecture",
    members: ["platform@incontext.local", "ops@incontext.local"],
    summaries: [
      {
        title: "Project created",
        kind: "GOAL",
        content: "Bootstrap context created for frontend-dashboard.",
        isPinned: true,
      },
      {
        title: "Codex to Claude handoff",
        kind: "HANDOFF",
        content: "Dashboard copy is aligned. Next step is wiring real project context reads from Prisma.",
        sourceSession: "codex-session-frontend-001",
      },
      {
        title: "Repo sync rule",
        kind: "DECISION",
        content: "Writable repo actions must stay project-scoped and auditable before any auto-commit path ships.",
      },
    ],
    documents: [
      {
        title: "Architecture overview",
        kind: "ARCHITECTURE",
        path: "docs/architecture/overview.md",
        content: "Next.js dashboard presents project memory, summaries, and scoped write access from Prisma-backed records.",
        checksum: "arch-frontend-overview",
        lastIndexedAt: subMinutes(new Date(), 18),
      },
      {
        title: "Runbook",
        kind: "RUNBOOK",
        path: "docs/runbooks/incontext.md",
        content: "Create project, attach repo, seed memory, then expose through MCP adapters.",
        checksum: "runbook-frontend-context",
        lastIndexedAt: subHours(new Date(), 2),
      },
    ],
    tokens: [
      {
        label: "Frontend GitHub App",
        provider: "github",
        kind: "GITHUB_APP",
        scopes: "contents:write,pull_requests:write",
        ownerEmail: "security@incontext.local",
        lastUsedAt: subHours(new Date(), 3),
      },
      {
        label: "Summary writer",
        provider: "internal",
        kind: "SERVICE_ACCOUNT",
        scopes: "summary:write,document:write",
        ownerEmail: "platform@incontext.local",
        lastUsedAt: subMinutes(new Date(), 42),
        expiresAt: subDays(new Date(), -12),
      },
    ],
    agents: [
      {
        agent: "CODEX",
        label: "Codex CLI",
        lastSyncedAt: subMinutes(new Date(), 7),
        userEmail: "platform@incontext.local",
      },
      {
        agent: "CLAUDE",
        label: "Claude Code",
        lastSyncedAt: subMinutes(new Date(), 26),
        userEmail: "ops@incontext.local",
      },
    ],
    commits: [
      {
        branch: "main",
        message: "Persist dashboard project registry metrics",
        status: "SUCCEEDED",
        commitSha: "4ca57f1",
        filesJson: JSON.stringify(["src/app/(main)/dashboard/productivity/page.tsx", "src/lib/productivity.ts"]),
        tokenLabel: "Frontend GitHub App",
        actorEmail: "platform@incontext.local",
        pullRequestUrl: "https://github.com/org/frontend-dashboard/pull/18",
      },
    ],
  },
  {
    name: "reference-mcp",
    slug: "reference-mcp",
    description: "Cross-agent MCP server for project boundaries, recall, and source adapters.",
    status: "DRAFT",
    repoUrl: "https://github.com/org/reference-mcp",
    defaultBranch: "main",
    contextPath: "memory/reference-mcp",
    architecturePath: "architecture/reference-mcp",
    members: ["platform@incontext.local", "security@incontext.local"],
    summaries: [
      {
        title: "Project created",
        kind: "GOAL",
        content: "Bootstrap context created for reference-mcp.",
        isPinned: true,
      },
      {
        title: "Shared brain scope",
        kind: "GOAL",
        content: "The MCP server must be project-native, not just session-search-native.",
      },
      {
        title: "Backend slice pending",
        kind: "PROGRESS",
        content: "Auth and project registry exist. Project APIs and MCP tools are the next slices.",
      },
      {
        title: "Handoff for backend scaffold",
        kind: "HANDOFF",
        content: "Start with project context read tools, then add create-project and write-intent endpoints.",
        sourceSession: "claude-session-mcp-002",
      },
    ],
    documents: [
      {
        title: "MCP server architecture",
        kind: "ARCHITECTURE",
        path: "architecture/reference-mcp/server.md",
        content: "Server exposes project registry, summaries, documents, and write-intent tools to external agents.",
        checksum: "arch-reference-server",
        lastIndexedAt: subMinutes(new Date(), 52),
      },
      {
        title: "Data model",
        kind: "DATA_MODEL",
        path: "architecture/reference-mcp/data-model.md",
        content: "Projects own summaries, architecture documents, agent bindings, access tokens, and commit logs.",
        checksum: "data-reference-model",
        lastIndexedAt: subHours(new Date(), 5),
      },
    ],
    tokens: [
      {
        label: "MCP service token",
        provider: "internal",
        kind: "SERVICE_ACCOUNT",
        scopes: "project:read,summary:write",
        ownerEmail: "platform@incontext.local",
        lastUsedAt: subHours(new Date(), 5),
      },
    ],
    agents: [
      {
        agent: "CODEX",
        label: "Codex CLI",
        lastSyncedAt: subMinutes(new Date(), 11),
        userEmail: "platform@incontext.local",
      },
      {
        agent: "CURSOR",
        label: "Cursor",
        lastSyncedAt: subHours(new Date(), 2),
        userEmail: "platform@incontext.local",
      },
    ],
    commits: [
      {
        branch: "main",
        message: "Scaffold MCP project tools",
        status: "QUEUED",
        filesJson: JSON.stringify(["server/index.ts", "server/tools/projects.ts"]),
        tokenLabel: "MCP service token",
        actorEmail: "platform@incontext.local",
      },
    ],
  },
  {
    name: "vedaai-backend",
    slug: "vedaai-backend",
    description: "Repo-linked backend with architecture sync and write-token review requirements.",
    status: "PAUSED",
    repoUrl: "https://github.com/org/vedaai-backend",
    defaultBranch: "develop",
    contextPath: "memory/vedaai-backend",
    architecturePath: "docs/backend",
    members: ["security@incontext.local", "ops@incontext.local"],
    summaries: [
      {
        title: "Project created",
        kind: "GOAL",
        content: "Bootstrap context created for vedaai-backend.",
        isPinned: true,
      },
      {
        title: "Token audit pending",
        kind: "PROGRESS",
        content: "Backend PAT is still broader than required. Narrow repo write before enabling automated commits.",
      },
      {
        title: "Architecture drift alert",
        kind: "HANDOFF",
        content: "Diff backend services against docs/backend before allowing the next architecture summary write.",
        sourceSession: "cursor-session-backend-004",
      },
    ],
    documents: [
      {
        title: "Backend architecture",
        kind: "ARCHITECTURE",
        path: "docs/backend/architecture.md",
        content: "Service graph and deployment notes for repo-linked backend sync.",
        checksum: "arch-backend-core",
        lastIndexedAt: subDays(new Date(), 1),
      },
      {
        title: "Ops runbook",
        kind: "RUNBOOK",
        path: "docs/backend/runbook.md",
        content: "Manual review remains required before any agent can push to develop or open remediation PRs.",
        checksum: "runbook-backend-ops",
        lastIndexedAt: subHours(new Date(), 7),
      },
    ],
    tokens: [
      {
        label: "Backend PAT",
        provider: "github",
        kind: "PERSONAL_ACCESS_TOKEN",
        scopes: "repo,pull_requests",
        ownerEmail: "security@incontext.local",
        lastUsedAt: subDays(new Date(), 1),
        expiresAt: subDays(new Date(), -3),
      },
    ],
    agents: [
      {
        agent: "CLAUDE",
        label: "Claude Code",
        lastSyncedAt: subHours(new Date(), 3),
        userEmail: "ops@incontext.local",
      },
      {
        agent: "OTHER",
        label: "Git bridge",
        lastSyncedAt: subHours(new Date(), 6),
        configJson: JSON.stringify({ transport: "github-app-proxy" }),
      },
    ],
    commits: [
      {
        branch: "develop",
        message: "Refresh backend architecture digest",
        status: "FAILED",
        filesJson: JSON.stringify(["docs/backend/architecture.md"]),
        tokenLabel: "Backend PAT",
        actorEmail: "security@incontext.local",
        errorMessage: "Token scope exceeds policy boundary and requires manual approval.",
      },
    ],
  },
];

function hashSeed(label: string) {
  return `seeded:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export async function ensureProjectBootstrapData() {
  for (const user of seededUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: {
        email: user.email,
        name: user.name,
      },
    });
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: seededUsers.map((user) => user.email),
      },
    },
  });

  const usersByEmail = new Map(users.map((user) => [user.email ?? "", user]));
  const owner = usersByEmail.get(DEFAULT_OWNER_EMAIL);

  if (!owner) {
    throw new Error("Bootstrap owner user could not be created.");
  }

  for (const seed of seedProjects) {
    const project = await prisma.project.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        description: seed.description,
        status: seed.status,
        repoUrl: seed.repoUrl,
        repoLocalPath: seed.repoLocalPath ?? null,
        defaultBranch: seed.defaultBranch,
        directCommitEnabled: seed.directCommitEnabled ?? false,
        contextPath: seed.contextPath,
        architecturePath: seed.architecturePath,
        createdById: owner.id,
      },
      create: {
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        status: seed.status,
        repoUrl: seed.repoUrl,
        repoLocalPath: seed.repoLocalPath ?? null,
        defaultBranch: seed.defaultBranch,
        directCommitEnabled: seed.directCommitEnabled ?? false,
        contextPath: seed.contextPath,
        architecturePath: seed.architecturePath,
        createdById: owner.id,
      },
    });

    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: owner.id,
        },
      },
      update: { role: "OWNER" },
      create: {
        projectId: project.id,
        userId: owner.id,
        role: "OWNER",
      },
    });

    for (const email of seed.members) {
      const member = usersByEmail.get(email);

      if (!member) {
        continue;
      }

      await prisma.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: member.id,
          },
        },
        update: { role: "MEMBER" },
        create: {
          projectId: project.id,
          userId: member.id,
          role: "MEMBER",
        },
      });
    }

    if ((await prisma.projectSummary.count({ where: { projectId: project.id } })) === 0) {
      await prisma.projectSummary.createMany({
        data: seed.summaries.map((summary) => ({
          projectId: project.id,
          authorId: owner.id,
          title: summary.title,
          kind: summary.kind,
          content: summary.content,
          sourceSession: summary.sourceSession,
          isPinned: summary.isPinned ?? false,
        })),
      });
    }

    if ((await prisma.architectureDocument.count({ where: { projectId: project.id } })) === 0) {
      await prisma.architectureDocument.createMany({
        data: seed.documents.map((document) => ({
          projectId: project.id,
          authorId: owner.id,
          title: document.title,
          kind: document.kind,
          path: document.path,
          content: document.content,
          checksum: document.checksum,
          lastIndexedAt: document.lastIndexedAt,
        })),
      });
    }

    if ((await prisma.agentConnection.count({ where: { projectId: project.id } })) === 0) {
      await prisma.agentConnection.createMany({
        data: seed.agents.map((agent) => ({
          projectId: project.id,
          userId: agent.userEmail ? usersByEmail.get(agent.userEmail)?.id : null,
          agent: agent.agent,
          label: agent.label,
          configJson: agent.configJson ?? null,
          lastSyncedAt: agent.lastSyncedAt,
        })),
      });
    }

    if ((await prisma.accessToken.count({ where: { projectId: project.id } })) === 0) {
      await prisma.accessToken.createMany({
        data: seed.tokens.map((token) => ({
          projectId: project.id,
          ownerId: usersByEmail.get(token.ownerEmail)?.id ?? owner.id,
          label: token.label,
          provider: token.provider,
          kind: token.kind,
          scopes: token.scopes,
          hashedSecret: hashSeed(token.label),
          lastUsedAt: token.lastUsedAt,
          expiresAt: token.expiresAt,
          revokedAt: token.revokedAt ?? null,
        })),
      });
    }

    if ((await prisma.commitLog.count({ where: { projectId: project.id } })) === 0) {
      const tokens = await prisma.accessToken.findMany({
        where: { projectId: project.id },
      });
      const tokensByLabel = new Map(tokens.map((token) => [token.label, token]));

      await prisma.commitLog.createMany({
        data: seed.commits.map((commit) => ({
          projectId: project.id,
          tokenId: commit.tokenLabel ? tokensByLabel.get(commit.tokenLabel)?.id ?? null : null,
          actorId: commit.actorEmail ? usersByEmail.get(commit.actorEmail)?.id ?? null : null,
          branch: commit.branch,
          message: commit.message,
          status: commit.status,
          filesJson: commit.filesJson ?? null,
          commitSha: commit.commitSha ?? null,
          pullRequestUrl: commit.pullRequestUrl ?? null,
          errorMessage: commit.errorMessage ?? null,
        })),
      });
    }
  }
}
