import Link from "next/link";

import {
  ArrowRight,
  Blocks,
  BookOpen,
  Bot,
  Command,
  Compass,
  FileCode2,
  FolderGit2,
  GitFork,
  Keyboard,
  PlayCircle,
  Search,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { id: "start-here", label: "Start here" },
  { id: "install-cli", label: "Install the CLI" },
  { id: "operations", label: "Operate locally" },
  { id: "link-and-resume", label: "Link and resume" },
  { id: "clients", label: "Connect clients" },
  { id: "workspace-model", label: "Workspace model" },
  { id: "repo-docs", label: "Repo docs" },
] as const;

const heroCards = [
  {
    title: "Install & authenticate",
    description: "Install the npm CLI, sign in once, and verify the local device that will own your MCP bridge.",
    icon: PlayCircle,
  },
  {
    title: "Link a project",
    description:
      "Bind the current repository to a project slug so summaries, notebooks, resume points, and commits stay scoped.",
    icon: FolderGit2,
  },
  {
    title: "Connect your agent",
    description:
      "Run the same local `mcp serve` bridge for Codex, Claude Code, Cursor, Copilot, Antigravity, and any other stdio MCP client.",
    icon: Bot,
  },
  {
    title: "Operate and inspect",
    description:
      "Run `status`, `doctor`, `view`, observation capture, and export/import without opening the hosted app first.",
    icon: Sparkles,
  },
] as const;

const cliInstallChoices = [
  {
    title: "Zero-install",
    body: "Use `npx` when you want a copyable command for docs, teammates, and IDE MCP configs.",
    code: ["npx incontext-cli help", "npx incontext-cli login --app-url https://in-context-gamma.vercel.app"],
  },
  {
    title: "Global install",
    body: "Install once with npm when you want shorter commands in your shell and MCP configs.",
    code: [
      "npm install -g incontext-cli",
      "incontext help",
      "incontext login --app-url https://in-context-gamma.vercel.app",
    ],
  },
] as const;

const workflowSteps = [
  {
    title: "1. Sign in and verify the device",
    body: "Browser-assisted login stores a local device token. `incontext whoami` confirms the active user and CLI device.",
    code: ["incontext login --app-url https://in-context-gamma.vercel.app", "incontext whoami", "incontext projects"],
  },
  {
    title: "2. Link the repo to a project slug",
    body: "Do this from the repository root. The CLI records the repo root, remote URL, and current branch.",
    code: ["cd /path/to/repo", "incontext project link <project-slug>", "incontext current"],
  },
  {
    title: "3. Save and resume shared state",
    body: "Create a pinned handoff, then rehydrate that context from any later session with its resume hash.",
    code: [
      'incontext handoff save --title "Session handoff" --content "What changed, what is blocked, what is next."',
      "incontext resume <hash>",
    ],
  },
] as const;

const operationsSteps = [
  {
    title: "Health and install checks",
    body: "Use these commands when the bridge is not behaving or before you hand the repo to a new machine.",
    code: ["incontext status", "incontext doctor", "incontext install --ide codex", "incontext install --ide all"],
  },
  {
    title: "Draft capture before notebook promotion",
    body: "Capture observations without mutating the shared notebook immediately, then promote the useful ones later.",
    code: [
      'incontext capture --title "Repo insight" --content "This should become part of the shared context later."',
      "incontext observations --status DRAFT",
      "incontext observation promote <observation-id>",
    ],
  },
  {
    title: "Read-only viewer and portability",
    body: "Open a local viewer for the current project or move the project snapshot between machines.",
    code: [
      "incontext view",
      "incontext export --project <project-slug> --output ./project.json",
      "incontext import --file ./project.json --mode new",
    ],
  },
] as const;

const clientGuides = [
  {
    name: "Codex",
    eyebrow: "OpenAI local agent",
    summary:
      "Use the InContext stdio bridge as a local MCP server and tag the session as a Codex agent so the project board gets a new block.",
    icon: Command,
    configHint: "Point the MCP server entry at this command.",
    code: ['npx incontext-cli mcp serve --agent CODEX --label "Codex CLI"'],
    notes: [
      "If you want the shortest command, install `incontext-cli` globally and swap `npx incontext-cli` for `incontext`.",
      "Every new `mcp serve` process now creates a fresh project agent node automatically when an active project is linked.",
    ],
  },
  {
    name: "Claude Code",
    eyebrow: "Anthropic CLI",
    summary:
      "Claude Code can register local stdio MCP servers directly from the terminal, which is the fastest path for a per-user setup.",
    icon: TerminalSquare,
    configHint: "Add the server once from the Claude CLI.",
    code: ['claude mcp add incontext -- npx incontext-cli mcp serve --agent CLAUDE --label "Claude Code"'],
    notes: [
      "After adding it, use `claude mcp list` to confirm the server is available.",
      "If you prefer shared project config, keep the same command in the project-level MCP config file.",
    ],
  },
  {
    name: "Cursor",
    eyebrow: "IDE and Cursor Agent",
    summary:
      "Cursor reads `mcp.json` style config and exposes MCP tools in both the IDE and the Cursor CLI agent flow.",
    icon: Blocks,
    configHint: "Put this in `.cursor/mcp.json` or `~/.cursor/mcp.json`.",
    code: [
      "{",
      '  "mcpServers": {',
      '    "incontext": {',
      '      "command": "npx",',
      '      "args": ["incontext-cli", "mcp", "serve", "--agent", "CURSOR", "--label", "Cursor"]',
      "    }",
      "  }",
      "}",
    ],
    notes: [
      "Project-level config is better when the workspace should carry its own MCP setup.",
      "Global config is better when the same bridge should follow you across repos.",
    ],
  },
  {
    name: "GitHub Copilot",
    eyebrow: "Copilot CLI and app",
    summary:
      "Copilot can add local stdio MCP servers from the CLI. Use a custom label and map the board type to `OTHER` for now.",
    icon: GitFork,
    configHint: "Add the server with the Copilot CLI.",
    code: ['copilot mcp add incontext -- npx incontext-cli mcp serve --agent OTHER --label "GitHub Copilot"'],
    notes: [
      "If you manage servers through `~/.copilot/mcp-config.json`, use the same command and args there instead.",
      "This keeps the visible workspace node labeled as GitHub Copilot even though the stored agent kind remains `OTHER`.",
    ],
  },
  {
    name: "Antigravity",
    eyebrow: "Google Antigravity",
    summary:
      "Antigravity can load local stdio MCP servers from its MCP config files. Use a custom label so the board shows which client created the session.",
    icon: Compass,
    configHint: "Use `~/.gemini/config/mcp_config.json` or `.agents/mcp_config.json`.",
    code: [
      "{",
      '  "mcpServers": {',
      '    "incontext": {',
      '      "command": "npx",',
      '      "args": ["incontext-cli", "mcp", "serve", "--agent", "OTHER", "--label", "Antigravity"]',
      "    }",
      "  }",
      "}",
    ],
    notes: [
      "Workspace config is the better default when you want the repo to carry its own agent bridge.",
      "Global config is useful when you want the same server available in every Antigravity workspace.",
    ],
  },
  {
    name: "Generic stdio client",
    eyebrow: "Anything else",
    summary:
      "If the client supports local stdio MCP servers, the only thing it needs is a command, its args, and optionally a custom label.",
    icon: FileCode2,
    configHint: "Fallback JSON shape.",
    code: [
      "{",
      '  "mcpServers": {',
      '    "incontext": {',
      '      "command": "npx",',
      '      "args": ["incontext-cli", "mcp", "serve", "--agent", "OTHER", "--label", "My Agent Client"]',
      "    }",
      "  }",
      "}",
    ],
    notes: [
      "Choose `CODEX`, `CLAUDE`, or `CURSOR` when one of those kinds is correct for the board.",
      "Use `OTHER` plus a specific label for everything else.",
    ],
  },
] as const;

const workspaceFacts = [
  "One project can have many agent nodes.",
  "A project has one shared notebook, not one notebook per agent.",
  "Every notebook write and agent-board update is logged.",
  "Resume hashes restore the latest saved handoff into a fresh session.",
] as const;

const repoDocs = [
  { label: "README", href: "https://github.com/FirePheonix/InContext/blob/main/README.md" },
  { label: "CLI Guide", href: "https://github.com/FirePheonix/InContext/blob/main/CLI.md" },
  { label: "Deploy Guide", href: "https://github.com/FirePheonix/InContext/blob/main/DEPLOY.md" },
  { label: "Contributing", href: "https://github.com/FirePheonix/InContext/blob/main/CONTRIBUTING.md" },
] as const;

function CodePanel({ code, className }: { code: readonly string[]; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4", className)}>
      <pre className="overflow-x-auto text-[13px] leading-6 text-zinc-200">
        <code>{code.join("\n")}</code>
      </pre>
    </div>
  );
}

function SectionTitle({
  badge,
  description,
  id,
  title,
}: {
  badge: string;
  description: string;
  id: string;
  title: string;
}) {
  return (
    <div id={id} className="scroll-mt-24 space-y-3">
      <Badge className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-900">{badge}</Badge>
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="max-w-3xl text-base leading-8 text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

export function DocsExperience() {
  return (
    <div data-content-padding="false" className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950">
      <div className="grid h-[calc(100dvh-var(--dashboard-header-height))] min-h-[720px] lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="hidden border-zinc-800 bg-zinc-950/95 lg:flex lg:flex-col">
          <div className="border-b border-zinc-800 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-white text-zinc-950">
                <BookOpen className="size-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold tracking-tight text-white">InContext</span>
                <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-900">Docs</Badge>
                <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-900">Core 3</Badge>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4">
              <div className="mb-3 text-sm font-medium text-white">Select your SDK</div>
              <div className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full border border-zinc-600 bg-zinc-950">
                    <span className="text-sm font-semibold">N</span>
                  </div>
                  <span className="text-lg">Next.js</span>
                </div>
                <ArrowRight className="size-4 text-zinc-500" />
              </div>
            </div>

            <nav className="mt-6 space-y-2">
              {sidebarItems.map((item, index) => (
                <Link
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-3 text-lg transition-colors",
                    index === 0 ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                  )}
                >
                  <span>{item.label}</span>
                  <ArrowRight className="size-4" />
                </Link>
              ))}
            </nav>

            <div className="mt-8 space-y-4 border-t border-zinc-800 pt-6">
              <div className="text-sm font-medium text-zinc-300">Workspace rules</div>
              <div className="space-y-3">
                {workspaceFacts.map((fact) => (
                  <div
                    key={fact}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm leading-6 text-zinc-400"
                  >
                    {fact}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 overflow-y-auto bg-zinc-950 text-zinc-50">
          <div className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-7">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-12 min-w-[18rem] max-w-[34rem] flex-1 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-zinc-400">
                  <Search className="size-4 shrink-0" />
                  <span className="truncate">Search documentation</span>
                  <Badge className="ml-auto border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-800">
                    <Keyboard className="mr-1 size-3" />
                    Ctrl K
                  </Badge>
                </div>
                <Button className="rounded-2xl bg-zinc-800 px-5 text-white hover:bg-zinc-700">Ask AI</Button>
              </div>
              <Button className="rounded-2xl bg-violet-600 px-5 text-white hover:bg-violet-500" asChild>
                <Link href="#install-cli">Install CLI</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto max-w-[88rem] space-y-16 px-5 py-8 md:px-7 md:py-10">
            <section id="start-here" className="scroll-mt-24 space-y-10 pt-2">
              <div className="space-y-6">
                <Badge className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-900">In-app docs</Badge>
                <div className="max-w-6xl space-y-6">
                  <h1 className="text-5xl font-semibold tracking-tight text-white md:text-6xl">
                    Welcome to InContext Docs
                  </h1>
                  <p className="max-w-6xl text-xl leading-10 text-zinc-400">
                    This is the operator path for InContext: install the CLI from npm, link a repo to a project slug,
                    wire MCP into your editor or terminal agent, and keep one shared project notebook across Codex,
                    Claude, Cursor, Copilot, Antigravity, and anything else that can launch a local stdio server.
                  </p>
                  <p className="max-w-5xl text-xl leading-10 text-zinc-400">
                    The docs below are intentionally biased toward the actual workflow that matters in this product:
                    individual users, local repos, resume hashes, and visible project agent blocks on the workspace
                    board.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-4">
                {heroCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/20"
                  >
                    <div className="mb-8 flex size-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-300">
                      <card.icon className="size-6" />
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-2xl font-semibold text-white">{card.title}</h2>
                      <p className="text-lg leading-8 text-zinc-400">{card.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-10">
              <SectionTitle
                id="install-cli"
                badge="CLI Setup"
                title="Install the CLI with npm"
                description="Pick either `npx` for copyable docs-friendly commands or a global npm install for shorter terminal and MCP server commands."
              />

              <div className="grid gap-5 xl:grid-cols-2">
                {cliInstallChoices.map((choice) => (
                  <div key={choice.title} className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6">
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold text-white">{choice.title}</h3>
                      <p className="text-base leading-8 text-zinc-400">{choice.body}</p>
                    </div>
                    <CodePanel code={choice.code} className="mt-5" />
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-10">
              <SectionTitle
                id="operations"
                badge="Local Operations"
                title="Operate, inspect, capture, and move projects"
                description="InContext should stay useful even when the hosted app is not the main thing you have open. These commands cover install health, draft capture, read-only viewing, and snapshot portability."
              />

              <div className="grid gap-5 xl:grid-cols-3">
                {operationsSteps.map((step) => (
                  <div key={step.title} className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6">
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold text-white">{step.title}</h3>
                      <p className="text-base leading-8 text-zinc-400">{step.body}</p>
                    </div>
                    <CodePanel code={step.code} className="mt-5" />
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-10">
              <SectionTitle
                id="link-and-resume"
                badge="Project Workflow"
                title="Link, hand off, and resume"
                description="The CLI is useful only after the current repo is linked to a project. Once linked, every handoff and resume hash stays inside the right project boundary."
              />

              <div className="grid gap-5 xl:grid-cols-3">
                {workflowSteps.map((step) => (
                  <div key={step.title} className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6">
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold text-white">{step.title}</h3>
                      <p className="text-base leading-8 text-zinc-400">{step.body}</p>
                    </div>
                    <CodePanel code={step.code} className="mt-5" />
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-10">
              <SectionTitle
                id="clients"
                badge="Client Setup"
                title="Connect Codex, Claude, Cursor, Copilot, Antigravity, and more"
                description="All of these clients converge on the same local bridge: `incontext-cli mcp serve`. Use the `--agent` and `--label` flags so the workspace board shows the right client and creates a new agent block when a fresh session starts."
              />

              <div className="grid gap-5 xl:grid-cols-2">
                {clientGuides.map((guide) => (
                  <div key={guide.name} className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
                          {guide.eyebrow}
                        </div>
                        <h3 className="text-2xl font-semibold text-white">{guide.name}</h3>
                        <p className="text-base leading-8 text-zinc-400">{guide.summary}</p>
                      </div>
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-300">
                        <guide.icon className="size-5" />
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300">
                      {guide.configHint}
                    </div>

                    <CodePanel code={guide.code} className="mt-4" />

                    <div className="mt-5 space-y-3">
                      {guide.notes.map((note) => (
                        <div
                          key={note}
                          className="rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm leading-6 text-zinc-400"
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
              <div className="space-y-10">
                <SectionTitle
                  id="workspace-model"
                  badge="Workspace Model"
                  title="How the project board should behave"
                  description="The project board is not a generic dashboard widget. It is the visible expression of the core product rules: one project, many agent nodes, one shared notebook, and an attributable activity log."
                />

                <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    {workspaceFacts.map((fact) => (
                      <div
                        key={fact}
                        className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-base leading-8 text-zinc-300"
                      >
                        {fact}
                      </div>
                    ))}
                  </div>

                  <CodePanel
                    code={[
                      'npx incontext-cli mcp serve --agent CODEX --label "Codex CLI"',
                      'npx incontext-cli mcp serve --agent CLAUDE --label "Claude Code"',
                      'npx incontext-cli mcp serve --agent CURSOR --label "Cursor"',
                      'npx incontext-cli mcp serve --agent OTHER --label "GitHub Copilot"',
                    ]}
                    className="mt-5"
                  />
                </div>
              </div>

              <aside id="repo-docs" className="scroll-mt-24 space-y-5">
                <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-white">Repo docs</h3>
                    <p className="text-base leading-8 text-zinc-400">
                      Use the in-app docs for the working path. Open the repo markdown when you need the longer form.
                    </p>
                  </div>
                  <div className="mt-5 flex flex-col gap-3">
                    {repoDocs.map((doc) => (
                      <Button
                        key={doc.label}
                        variant="outline"
                        className="justify-between rounded-2xl border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-900 hover:text-white"
                        asChild
                      >
                        <Link href={doc.href} target="_blank" rel="noreferrer">
                          {doc.label}
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-white">First run</h3>
                    <p className="text-base leading-8 text-zinc-400">
                      Minimal path for a new operator standing up InContext in a repo for the first time.
                    </p>
                  </div>
                  <CodePanel
                    code={[
                      "npm install -g incontext-cli",
                      "incontext install --ide codex",
                      "incontext login --app-url https://in-context-gamma.vercel.app",
                      "incontext projects",
                      "incontext project link <project-slug>",
                      'incontext mcp serve --agent CODEX --label "Codex CLI"',
                    ]}
                    className="mt-5"
                  />
                </div>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
