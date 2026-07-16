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

async function loadCurrentProjectContext(config) {
  if (!config.activeProjectSlug) {
    throw new Error("No active project. Run `incontext project link <project-slug>` or `incontext resume <hash>` first.");
  }

  return apiRequest({
    config,
    path: `/api/projects/${encodeURIComponent(config.activeProjectSlug)}/context`,
  });
}

export async function startLocalMcpServer() {
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const z = await import("zod/v4");

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
      const branch = projectState?.branch ?? (projectState?.repoRoot ? await getGitBranch(projectState.repoRoot).catch(() => "") : "");
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
  await server.connect(transport);
}
