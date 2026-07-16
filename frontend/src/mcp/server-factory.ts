import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";

import { executeCommitIntent } from "@/lib/git-bridge";
import {
  createCommitIntent,
  createProject,
  createProjectSummary,
  getProjectDetail,
  getProjectRegistry,
} from "@/lib/project-service";

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function createContextHubMcpServer() {
  const server = new McpServer(
    {
      name: "context-hub",
      version: "0.1.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  server.registerResource(
    "project-registry",
    "contexthub://projects",
    {
      title: "Project registry",
      description: "All known projects with counts for summaries, documents, and tokens.",
      mimeType: "application/json",
    },
    async () => {
      const projects = await getProjectRegistry();

      return {
        contents: [
          {
            uri: "contexthub://projects",
            mimeType: "application/json",
            text: JSON.stringify({ projects }, null, 2),
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "project-handoff",
    {
      title: "Project handoff",
      description: "Generate a structured handoff request for a specific project.",
      argsSchema: {
        slug: z.string().describe("Project slug"),
        goal: z.string().describe("Immediate goal for the next agent"),
      },
    },
    async ({ slug, goal }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Review project ${slug}, preserve the current architecture context, and continue with this goal: ${goal}.`,
          },
        },
      ],
    }),
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List all projects in the shared context hub registry.",
    },
    async () => textResult({ projects: await getProjectRegistry() }),
  );

  server.registerTool(
    "get_project_detail",
    {
      title: "Get project detail",
      description: "Load detailed project metadata, summaries, documents, tokens, and commit history.",
      inputSchema: {
        slug: z.string().describe("Project slug"),
      },
    },
    async ({ slug }) => {
      const project = await getProjectDetail(slug);

      if (!project) {
        throw new Error(`Project '${slug}' was not found.`);
      }

      return textResult({ project });
    },
  );

  server.registerTool(
    "get_project_context",
    {
      title: "Get project context",
      description: "Fetch summaries, documents, tokens, and commit history for a project.",
      inputSchema: {
        slug: z.string().describe("Project slug"),
      },
    },
    async ({ slug }) => {
      const project = await getProjectDetail(slug);

      if (!project) {
        throw new Error(`Project '${slug}' was not found.`);
      }

      return textResult({
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          status: project.status,
          repoUrl: project.repoUrl,
          defaultBranch: project.defaultBranch,
        },
        context: {
          summaries: project.summaries,
          documents: project.documents,
          agents: project.agents,
          tokens: project.tokens,
          commits: project.commits,
        },
      });
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description: "Create a new project and seed its initial goal summary.",
      inputSchema: {
        name: z.string().describe("Project name"),
        slug: z.string().optional().describe("Optional slug override"),
        description: z.string().optional().describe("Short project summary"),
        repoUrl: z.string().optional().describe("Repository URL"),
        repoLocalPath: z.string().optional().describe("Absolute local repo path for direct git execution"),
        defaultBranch: z.string().optional().describe("Default git branch"),
        directCommitEnabled: z.boolean().optional().describe("Whether local direct commits are enabled"),
        contextPath: z.string().optional().describe("Path where project memory lives"),
        architecturePath: z.string().optional().describe("Path where architecture docs live"),
      },
    },
    async (input) => textResult({ project: await createProject(input) }),
  );

  server.registerTool(
    "add_project_summary",
    {
      title: "Add project summary",
      description: "Append a goal, progress note, decision, or handoff summary to a project.",
      inputSchema: {
        slug: z.string().describe("Project slug"),
        title: z.string().describe("Summary title"),
        content: z.string().describe("Summary body"),
        kind: z.enum(["GOAL", "PROGRESS", "HANDOFF", "DECISION"]).optional().describe("Summary type"),
        sourceSession: z.string().optional().describe("Original session identifier"),
        isPinned: z.boolean().optional().describe("Whether to pin the summary"),
      },
    },
    async ({ slug, ...input }) => textResult({ summary: await createProjectSummary(slug, input) }),
  );

  server.registerTool(
    "queue_commit_intent",
    {
      title: "Queue commit intent",
      description: "Queue an auditable commit intent for a project without writing to git directly.",
      inputSchema: {
        slug: z.string().describe("Project slug"),
        message: z.string().describe("Proposed commit message"),
        branch: z.string().optional().describe("Target branch"),
        tokenLabel: z.string().optional().describe("Scoped token label to use"),
        files: z.array(z.string()).optional().describe("Files the agent intends to change"),
      },
    },
    async ({ slug, ...input }) => textResult({ commit: await createCommitIntent(slug, input) }),
  );

  server.registerTool(
    "execute_commit_intent",
    {
      title: "Execute commit intent",
      description: "Execute a queued commit intent against the configured local repository path for a project.",
      inputSchema: {
        slug: z.string().describe("Project slug"),
        commitId: z.string().describe("Queued commit intent identifier"),
      },
    },
    async ({ slug, commitId }) => textResult({ commit: await executeCommitIntent(slug, commitId) }),
  );

  return server;
}
