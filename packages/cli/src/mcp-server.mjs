import { apiRequest } from "./api.mjs";
import { findProjectState, loadConfig, saveConfig, upsertProjectState } from "./config.mjs";
import { getGitBranch } from "./git.mjs";
import { commitAndPushLinkedRepo } from "./repo.mjs";

function textResult(value) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function getAgentLabel(agent) {
  if (agent === "CLAUDE") {
    return "Claude Code";
  }

  if (agent === "CURSOR") {
    return "Cursor";
  }

  if (agent === "OTHER") {
    return "External Agent";
  }

  return "Codex CLI";
}

function buildDefaultSessionLabel(agent) {
  const timestamp = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());

  return `${getAgentLabel(agent)} - ${timestamp}`;
}

async function registerActiveProjectAgent(config, options) {
  if (!config.activeProjectSlug) {
    return null;
  }

  const agent = options.agent ?? "CODEX";
  const label = options.label?.trim() || buildDefaultSessionLabel(agent);

  const result = await apiRequest({
    config,
    path: `/api/projects/${encodeURIComponent(config.activeProjectSlug)}/agents`,
    method: "POST",
    body: {
      agent,
      label,
      status: "ACTIVE",
    },
  });

  return {
    agentId: result.agent.id,
    label,
    projectSlug: config.activeProjectSlug,
  };
}

async function updateRegisteredAgentStatus(config, registration, status) {
  if (!registration) {
    return;
  }

  await apiRequest({
    config,
    path: `/api/projects/${encodeURIComponent(registration.projectSlug)}/agents/${encodeURIComponent(registration.agentId)}`,
    method: "PATCH",
    body: {
      status,
    },
  });
}

async function loadCurrentProjectContext(config) {
  if (!config.activeProjectSlug) {
    throw new Error(
      "No active project. Run `incontext project link <project-slug>` or `incontext resume <hash>` first.",
    );
  }

  return apiRequest({
    config,
    path: `/api/projects/${encodeURIComponent(config.activeProjectSlug)}/context`,
  });
}

export async function startLocalMcpServer(options = {}) {
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const z = await import("zod/v4");
  const startupConfig = await loadConfig();
  let registration = null;

  try {
    registration = await registerActiveProjectAgent(startupConfig, options);
  } catch (error) {
    console.warn(
      `Warning: failed to register the local ${getAgentLabel(options.agent ?? "CODEX")} session in InContext.`,
    );
    console.warn(error instanceof Error ? error.message : String(error));
  }

  let finalized = false;

  async function finalizeRegistration() {
    if (finalized) {
      return;
    }

    finalized = true;

    try {
      await updateRegisteredAgentStatus(startupConfig, registration, "IDLE");
    } catch {
      // Ignore shutdown sync failures.
    }
  }

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.once(signal, () => {
      void finalizeRegistration().finally(() => {
        process.exit(0);
      });
    });
  }

  const server = new McpServer(
    {
      name: "incontext-local",
      version: "0.1.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  server.registerTool(
    "search_project_memory",
    {
      title: "Search project memory",
      description: "Search notebook, summaries, documents, resume points, commits, and audit activity for a project.",
      inputSchema: {
        projectSlug: z.string().optional(),
        query: z.string(),
        limit: z.number().optional(),
        types: z
          .array(z.enum(["ACTIVITY", "COMMIT", "DOCUMENT", "NOTEBOOK", "OBSERVATION", "RESUME_POINT", "SUMMARY"]))
          .optional(),
      },
    },
    async ({ projectSlug, query, limit, types }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      const searchParams = new URLSearchParams({
        q: query,
      });

      if (typeof limit === "number") {
        searchParams.set("limit", String(limit));
      }

      if (types?.length) {
        searchParams.set("types", types.join(","));
      }

      return textResult(
        await apiRequest({
          config,
          path: `/api/projects/${encodeURIComponent(targetSlug)}/search?${searchParams.toString()}`,
        }),
      );
    },
  );

  server.registerTool(
    "timeline_project_activity",
    {
      title: "Timeline project activity",
      description: "Read a recent timeline across notebook updates, summaries, resume points, commits, and audit events.",
      inputSchema: {
        projectSlug: z.string().optional(),
        limit: z.number().optional(),
      },
    },
    async ({ projectSlug, limit }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      const searchParams = new URLSearchParams();

      if (typeof limit === "number") {
        searchParams.set("limit", String(limit));
      }

      return textResult(
        await apiRequest({
          config,
          path: `/api/projects/${encodeURIComponent(targetSlug)}/timeline${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
        }),
      );
    },
  );

  server.registerTool(
    "get_context_entries",
    {
      title: "Get context entries",
      description: "Read a recent unified feed of notebook, summaries, documents, resume points, commits, and activity.",
      inputSchema: {
        projectSlug: z.string().optional(),
        limit: z.number().optional(),
        types: z
          .array(z.enum(["ACTIVITY", "COMMIT", "DOCUMENT", "NOTEBOOK", "OBSERVATION", "RESUME_POINT", "SUMMARY"]))
          .optional(),
      },
    },
    async ({ projectSlug, limit, types }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      const searchParams = new URLSearchParams();

      if (typeof limit === "number") {
        searchParams.set("limit", String(limit));
      }

      if (types?.length) {
        searchParams.set("types", types.join(","));
      }

      return textResult(
        await apiRequest({
          config,
          path: `/api/projects/${encodeURIComponent(targetSlug)}/entries${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
        }),
      );
    },
  );

  server.registerTool(
    "capture_project_observation",
    {
      title: "Capture project observation",
      description: "Store a draft observation for the active or specified project without editing the shared notebook yet.",
      inputSchema: {
        projectSlug: z.string().optional(),
        title: z.string(),
        content: z.string(),
        sourceAgent: z.enum(["CODEX", "CLAUDE", "CURSOR", "OTHER"]).optional(),
        sourceLabel: z.string().optional(),
        sourceSession: z.string().optional(),
        promote: z.boolean().optional(),
      },
    },
    async ({ projectSlug, promote, ...input }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      const observation = await apiRequest({
        config,
        path: `/api/projects/${encodeURIComponent(targetSlug)}/observations`,
        method: "POST",
        body: input,
      });

      if (!promote) {
        return textResult(observation);
      }

      const promoted = await apiRequest({
        config,
        path: `/api/projects/${encodeURIComponent(targetSlug)}/observations/${encodeURIComponent(observation.observation.id)}`,
        method: "PATCH",
        body: {
          action: "promote",
        },
      });

      return textResult({
        observation: observation.observation,
        promoted: promoted.observation,
      });
    },
  );

  server.registerTool(
    "list_project_observations",
    {
      title: "List project observations",
      description: "List draft or promoted observations for the active or specified project.",
      inputSchema: {
        projectSlug: z.string().optional(),
        limit: z.number().optional(),
        status: z.enum(["DRAFT", "PROMOTED", "all"]).optional(),
      },
    },
    async ({ projectSlug, limit, status }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      const searchParams = new URLSearchParams();

      if (typeof limit === "number") {
        searchParams.set("limit", String(limit));
      }

      if (status) {
        searchParams.set("status", status);
      }

      return textResult(
        await apiRequest({
          config,
          path: `/api/projects/${encodeURIComponent(targetSlug)}/observations${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
        }),
      );
    },
  );

  server.registerTool(
    "promote_project_observation",
    {
      title: "Promote project observation",
      description: "Promote a captured observation into the shared notebook and mark it as promoted.",
      inputSchema: {
        projectSlug: z.string().optional(),
        observationId: z.string(),
      },
    },
    async ({ projectSlug, observationId }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      return textResult(
        await apiRequest({
          config,
          path: `/api/projects/${encodeURIComponent(targetSlug)}/observations/${encodeURIComponent(observationId)}`,
          method: "PATCH",
          body: {
            action: "promote",
          },
        }),
      );
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description: "Create a new project in the signed-in InContext workspace.",
      inputSchema: {
        name: z.string(),
        slug: z.string().optional(),
        description: z.string().optional(),
        repoUrl: z.string().optional(),
        repoLocalPath: z.string().optional(),
        defaultBranch: z.string().optional(),
        contextPath: z.string().optional(),
        architecturePath: z.string().optional(),
      },
    },
    async (input) => {
      const config = await loadConfig();

      return textResult(
        await apiRequest({
          config,
          path: "/api/projects",
          method: "POST",
          body: input,
        }),
      );
    },
  );

  server.registerTool(
    "get_current_project",
    {
      title: "Get current project",
      description: "Return the active local InContext project and its hosted context.",
    },
    async () => {
      const config = await loadConfig();
      const project = await loadCurrentProjectContext(config);

      return textResult(project);
    },
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List projects visible to the signed-in local user.",
    },
    async () => {
      const config = await loadConfig();
      const projects = await apiRequest({
        config,
        path: "/api/projects",
      });

      return textResult(projects);
    },
  );

  server.registerTool(
    "get_project_context",
    {
      title: "Get project context",
      description: "Load project context by slug or fall back to the active project.",
      inputSchema: {
        slug: z.string().optional(),
      },
    },
    async ({ slug }) => {
      const config = await loadConfig();
      const targetSlug = slug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No project slug provided and no active project is set.");
      }

      const project = await apiRequest({
        config,
        path: `/api/projects/${encodeURIComponent(targetSlug)}/context`,
      });

      return textResult(project);
    },
  );

  server.registerTool(
    "get_project_workspace",
    {
      title: "Get project workspace",
      description: "Load the shared notebook, agent nodes, and recent activity for a project.",
      inputSchema: {
        slug: z.string().optional(),
      },
    },
    async ({ slug }) => {
      const config = await loadConfig();
      const targetSlug = slug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No project slug provided and no active project is set.");
      }

      return textResult(
        await apiRequest({
          config,
          path: `/api/projects/${encodeURIComponent(targetSlug)}/workspace`,
        }),
      );
    },
  );

  server.registerTool(
    "resume_project",
    {
      title: "Resume project",
      description: "Activate a saved resume point by hash and return its context.",
      inputSchema: {
        hash: z.string(),
      },
    },
    async ({ hash }) => {
      const config = await loadConfig();
      const result = await apiRequest({
        config,
        path: `/api/cli/resume-points/${encodeURIComponent(hash)}`,
      });

      const projectState = findProjectState(config, result.resumePoint.project.slug);
      const nextConfig = {
        ...config,
        activeProjectSlug: result.resumePoint.project.slug,
        lastResumeHash: result.resumePoint.hash,
      };

      if (projectState) {
        await saveConfig(
          upsertProjectState(nextConfig, {
            ...projectState,
            branch: result.resumePoint.branch ?? projectState.branch,
            lastResumeHash: result.resumePoint.hash,
            updatedAt: result.resumePoint.createdAt,
          }),
        );
      } else {
        await saveConfig(nextConfig);
      }

      return textResult(result);
    },
  );

  server.registerTool(
    "register_project_agent",
    {
      title: "Register project agent",
      description: "Create an agent node for the active or specified project workspace.",
      inputSchema: {
        projectSlug: z.string().optional(),
        label: z.string(),
        agent: z.enum(["CODEX", "CLAUDE", "CURSOR", "OTHER"]),
        status: z.enum(["ACTIVE", "IDLE", "WAITING", "BLOCKED"]).optional(),
      },
    },
    async ({ projectSlug, ...input }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      return textResult(
        await apiRequest({
          config,
          path: `/api/projects/${encodeURIComponent(targetSlug)}/agents`,
          method: "POST",
          body: input,
        }),
      );
    },
  );

  server.registerTool(
    "update_shared_notebook",
    {
      title: "Update shared notebook",
      description: "Write the project's single shared notebook and log which agent updated it.",
      inputSchema: {
        projectSlug: z.string().optional(),
        content: z.string(),
        title: z.string().optional(),
        agentConnectionId: z.string().optional(),
        agentLabel: z.string().optional(),
      },
    },
    async ({ projectSlug, ...input }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      return textResult(
        await apiRequest({
          config,
          path: `/api/projects/${encodeURIComponent(targetSlug)}/notebook`,
          method: "PATCH",
          body: input,
        }),
      );
    },
  );

  server.registerTool(
    "add_handoff",
    {
      title: "Add handoff",
      description: "Create a new resume point and pinned handoff summary for the active or specified project.",
      inputSchema: {
        content: z.string(),
        projectSlug: z.string().optional(),
        sourceSession: z.string().optional(),
        title: z.string(),
      },
    },
    async ({ projectSlug, ...input }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      const projectState = findProjectState(config, targetSlug);
      const branch =
        projectState?.branch ??
        (projectState?.repoRoot ? await getGitBranch(projectState.repoRoot).catch(() => "") : "");
      const result = await apiRequest({
        config,
        path: "/api/cli/resume-points",
        method: "POST",
        body: {
          projectSlug: targetSlug,
          title: input.title,
          content: input.content,
          sourceSession: input.sourceSession,
          branch: branch || undefined,
        },
      });

      if (projectState) {
        await saveConfig(
          upsertProjectState(
            {
              ...config,
              activeProjectSlug: targetSlug,
              lastResumeHash: result.resumePoint.hash,
            },
            {
              ...projectState,
              lastResumeHash: result.resumePoint.hash,
              updatedAt: result.resumePoint.createdAt,
            },
          ),
        );
      }

      return textResult(result);
    },
  );

  server.registerTool(
    "update_progress",
    {
      title: "Update progress",
      description: "Append a progress summary to the active or specified project.",
      inputSchema: {
        content: z.string(),
        projectSlug: z.string().optional(),
        title: z.string(),
      },
    },
    async ({ projectSlug, title, content }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      return textResult(
        await apiRequest({
          config,
          path: `/api/projects/${encodeURIComponent(targetSlug)}/summaries`,
          method: "POST",
          body: {
            title,
            content,
            kind: "PROGRESS",
          },
        }),
      );
    },
  );

  server.registerTool(
    "record_decision",
    {
      title: "Record decision",
      description: "Append a decision summary to the active or specified project.",
      inputSchema: {
        content: z.string(),
        projectSlug: z.string().optional(),
        title: z.string(),
      },
    },
    async ({ projectSlug, title, content }) => {
      const config = await loadConfig();
      const targetSlug = projectSlug || config.activeProjectSlug;

      if (!targetSlug) {
        throw new Error("No active project is set.");
      }

      return textResult(
        await apiRequest({
          config,
          path: `/api/projects/${encodeURIComponent(targetSlug)}/summaries`,
          method: "POST",
          body: {
            title,
            content,
            kind: "DECISION",
          },
        }),
      );
    },
  );

  server.registerTool(
    "commit_and_push",
    {
      title: "Commit and push",
      description: "Commit local changes inside the linked repo for the active project and optionally push to origin.",
      inputSchema: {
        files: z.array(z.string()).optional(),
        message: z.string(),
        push: z.boolean().optional(),
      },
    },
    async ({ message, files, push }) => {
      const config = await loadConfig();

      if (!config.activeProjectSlug) {
        throw new Error("No active project is set.");
      }

      const projectState = findProjectState(config, config.activeProjectSlug);

      if (!projectState?.repoRoot) {
        throw new Error("The active project is not linked to a local repository.");
      }

      const branch = await getGitBranch(projectState.repoRoot);

      try {
        const localCommit = await commitAndPushLinkedRepo({
          repoRoot: projectState.repoRoot,
          branch,
          message,
          files,
          push: push ?? true,
        });

        const commit = await apiRequest({
          config,
          path: "/api/cli/commits",
          method: "POST",
          body: {
            projectSlug: config.activeProjectSlug,
            message,
            branch,
            files: localCommit.files,
            status: "SUCCEEDED",
            commitSha: localCommit.commitSha,
          },
        });

        return textResult({
          localCommit,
          commit,
        });
      } catch (error) {
        await apiRequest({
          config,
          path: "/api/cli/commits",
          method: "POST",
          body: {
            projectSlug: config.activeProjectSlug,
            message,
            branch,
            files,
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Commit failed.",
          },
        });

        throw error;
      }
    },
  );

  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
  } finally {
    await finalizeRegistration();
  }
}
