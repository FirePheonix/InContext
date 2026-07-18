import type { ReactNode } from "react";

import Link from "next/link";

import { ArrowRight, BookOpen, Bot, Command, FolderGit2, Keyboard, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const contents = [
  { id: "start-here", label: "Start here" },
  { id: "install-cli", label: "Install the CLI" },
  { id: "daily-flow", label: "Daily flow" },
  { id: "clients", label: "Connect clients" },
  { id: "workspace-model", label: "Workspace model" },
  { id: "repo-docs", label: "Repo docs" },
] as const;

const startItems = [
  {
    title: "Install the CLI.",
    text: "Use `npx` for copyable docs examples, or install `incontext-cli` globally if you want shorter commands.",
  },
  {
    title: "Link the repo.",
    text: "Run the link command from the repository root so the local checkout, branch, and remote stay attached to one project slug.",
  },
  {
    title: "Start the bridge.",
    text: "Use `incontext mcp serve` for a fail-closed bridge, or add `--allow-project-create` only when that session may create a missing project.",
  },
] as const;

const installOptions = [
  {
    title: "Copyable install",
    text: "Best when you want a command you can paste into docs, issue comments, or editor config.",
    lines: ["npx incontext-cli help", "npx incontext-cli login --app-url https://in-context-gamma.vercel.app"],
  },
  {
    title: "Global install",
    text: "Best when you want the shortest command path in your own shell.",
    lines: [
      "npm install -g incontext-cli",
      "incontext help",
      "incontext login --app-url https://in-context-gamma.vercel.app",
    ],
  },
] as const;

const dailyFlow = [
  {
    step: "1. Sign in",
    text: "Browser login stores a local device token. `whoami` confirms the active user.",
    lines: ["npm run cli -- login --app-url https://your-vercel-domain", "incontext whoami", "incontext projects"],
  },
  {
    step: "2. Link the repo",
    text: "Attach the current checkout to a project slug from the repo root.",
    lines: ["incontext project link <project-slug>", "incontext current"],
  },
  {
    step: "3. Save context",
    text: "Capture a handoff, then resume it later from another terminal.",
    lines: [
      'incontext handoff save --title "Session handoff" --content "What changed, what is next, and open issues."',
      "incontext resume <hash>",
    ],
  },
  {
    step: "4. Keep moving",
    text: "Use the local bridge for agents, then check health or open the viewer when needed.",
    lines: ["incontext mcp serve", "incontext status", "incontext doctor", "incontext view"],
  },
] as const;

const clientGuides = [
  {
    name: "Codex",
    eyebrow: "OpenAI local agent",
    summary: "Run the local bridge with a Codex label so the project board gets a clear node.",
    icon: Command,
    configHint: "Use this command in the MCP config.",
    lines: ['npx incontext-cli mcp serve --agent CODEX --label "Codex CLI"'],
    notes: [
      "Use `incontext` instead of `npx incontext-cli` if you installed the package globally.",
      "Add `--allow-project-create` only when the session is allowed to create a missing project.",
    ],
  },
  {
    name: "Claude Code",
    eyebrow: "Anthropic CLI",
    summary: "Add the same stdio bridge from the Claude CLI and keep the session labeled.",
    icon: Bot,
    configHint: "Register the server once from the terminal.",
    lines: ['claude mcp add incontext -- npx incontext-cli mcp serve --agent CLAUDE --label "Claude Code"'],
    notes: [
      "Use `claude mcp list` to confirm the server entry.",
      "Keep the command identical in project-level config if the workspace should own it.",
    ],
  },
  {
    name: "Cursor",
    eyebrow: "IDE and Cursor Agent",
    summary: "Cursor reads a local MCP config file and exposes the same tools in the IDE and the CLI agent flow.",
    icon: FolderGit2,
    configHint: "Put this in `.cursor/mcp.json` or `~/.cursor/mcp.json`.",
    lines: [
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
      "Use project-level config when the repo should carry its own agent bridge.",
      "Use global config when you want the same bridge across multiple repos.",
    ],
  },
  {
    name: "GitHub Copilot",
    eyebrow: "Copilot CLI and app",
    summary: "Copilot can launch the same local stdio bridge and display a clear session label.",
    icon: Sparkles,
    configHint: "Add the server with the Copilot CLI.",
    lines: ['copilot mcp add incontext -- npx incontext-cli mcp serve --agent OTHER --label "GitHub Copilot"'],
    notes: [
      "Use the same command in `~/.copilot/mcp-config.json` if you manage config by hand.",
      "The workspace node stays labeled while the stored agent kind remains `OTHER`.",
    ],
  },
  {
    name: "Antigravity",
    eyebrow: "Google Antigravity",
    summary: "Antigravity can read the same MCP config files and keep the session label visible on the board.",
    icon: Keyboard,
    configHint: "Use `~/.gemini/config/mcp_config.json` or `.agents/mcp_config.json`.",
    lines: [
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
      "Workspace config is better when the repo should own the agent bridge.",
      "Global config is better when you want the bridge everywhere.",
    ],
  },
  {
    name: "Generic stdio client",
    eyebrow: "Anything else",
    summary: "If the client can launch a local stdio process, it only needs the command, args, and an optional label.",
    icon: ArrowRight,
    configHint: "Fallback JSON shape.",
    lines: [
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
      "Choose `CODEX`, `CLAUDE`, or `CURSOR` when one of those agent kinds is correct.",
      "Use `OTHER` plus a specific label for everything else.",
    ],
  },
] as const;

const workspaceFacts = [
  "One project can have many agent nodes.",
  "A project has one shared notebook.",
  "Notebook writes and board updates are logged.",
  "Resume hashes restore the latest saved handoff into a fresh session.",
] as const;

const repoDocs = [
  { label: "README", href: "https://github.com/FirePheonix/InContext/blob/main/README.md" },
  { label: "CLI Guide", href: "https://github.com/FirePheonix/InContext/blob/main/CLI.md" },
  { label: "Deploy Guide", href: "https://github.com/FirePheonix/InContext/blob/main/DEPLOY.md" },
  { label: "Contributing", href: "https://github.com/FirePheonix/InContext/blob/main/CONTRIBUTING.md" },
] as const;

function Section({
  badge,
  description,
  id,
  title,
  children,
}: {
  badge: string;
  description: string;
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-2 border-t border-border pt-5">
      <div className="space-y-2">
        <Badge variant="outline" className="w-fit text-[10px]">
          {badge}
        </Badge>
        <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">{title}</h2>
        <p className="max-w-3xl text-xs leading-5 text-muted-foreground md:text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CommandLines({ lines }: { lines: readonly string[] }) {
  return (
    <MarkdownBlock
      markdown={lines.map((line) => `- \`${line.replace(/`/g, "\\`")}\``).join("\n")}
      className="border-l-2 border-border pl-3"
    />
  );
}

function NoteLines({ notes }: { notes: readonly string[] }) {
  return (
    <MarkdownBlock markdown={notes.map((note) => `- ${note}`).join("\n")} className="space-y-1" />
  );
}

function MarkdownBlock({ className, markdown }: { className?: string; markdown: string }) {
  const lines = markdown.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      nodes.push(
        <h4 key={`h4-${index}`} className="text-xs font-semibold tracking-tight text-foreground md:text-sm">
          {renderInlineMarkdown(line.slice(4))}
        </h4>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h3 key={`h3-${index}`} className="text-sm font-semibold tracking-tight text-foreground md:text-base">
          {renderInlineMarkdown(line.slice(3))}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }

      nodes.push(
        <ul key={`ul-${index}`} className="space-y-1">
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`} className="text-xs leading-5 text-muted-foreground md:text-sm">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s/, ""));
        index += 1;
      }

      nodes.push(
        <ol key={`ol-${index}`} className="space-y-1 pl-4">
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`} className="text-xs leading-5 text-muted-foreground md:text-sm">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      nodes.push(
        <pre
          key={`pre-${index}`}
          className="overflow-x-auto rounded-xl border border-border bg-muted/30 px-4 py-3 text-[11px] leading-5 text-foreground md:text-xs"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    nodes.push(
      <p key={`p-${index}`} className="text-xs leading-5 text-muted-foreground md:text-sm">
        {renderInlineMarkdown(line)}
      </p>,
    );
    index += 1;
  }

  return <div className={className}>{nodes}</div>;
}

function renderInlineMarkdown(value: string) {
  const segments: ReactNode[] = [];
  const pattern = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push(value.slice(lastIndex, match.index));
    }

    segments.push(
      <code key={`${match.index}-${match[1]}`} className="font-mono text-foreground">
        {match[1]}
      </code>,
    );
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    segments.push(value.slice(lastIndex));
  }

  return segments.length === 1 ? segments[0] : segments;
}

export function DocsExperience() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-3.5 text-muted-foreground" />
          <Badge variant="outline" className="text-[10px]">
            In-app docs
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Core workflow
          </Badge>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">InContext Docs</h1>
          <p className="max-w-3xl text-xs leading-5 text-muted-foreground md:text-sm">
            This page is the working path for the product. It stays close to the rest of the dashboard, keeps the
            typography small, and explains the CLI and MCP flow one line at a time.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {contents.map((item) => (
            <Link key={item.id} href={`#${item.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
              {item.label}
              <ArrowRight className="size-2.5" />
            </Link>
          ))}
        </div>
      </header>

      <Separator />

      <Section
        id="start-here"
        badge="Start here"
        title="Start with the CLI, then link the repo"
        description="Keep the first setup short: install the CLI, connect the current checkout to one project, then open the local bridge when you need an agent session."
      >
        <ol className="space-y-3">
          {startItems.map((item, index) => (
            <li key={item.title} className="space-y-1">
              <div className="text-xs font-medium text-foreground md:text-sm">
                {index + 1}. {item.title}
              </div>
              <p className="text-xs leading-5 text-muted-foreground md:text-sm">{item.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="install-cli"
        badge="CLI setup"
        title="Install the CLI with npm"
        description="Choose the install shape that matches how you work. Both routes end at the same local command."
      >
        <div className="space-y-4">
          {installOptions.map((option) => (
            <div key={option.title} className="space-y-2.5">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">{option.title}</h3>
                <p className="text-xs leading-5 text-muted-foreground">{option.text}</p>
              </div>
              <CommandLines lines={option.lines} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="daily-flow"
        badge="Daily flow"
        title="Use the same sequence every session"
        description="The recommended path is stable: sign in, link the repo, save shared context, then start the bridge when an agent needs it."
      >
        <div className="space-y-4">
          {dailyFlow.map((step) => (
            <div key={step.step} className="space-y-1">
              <div className="text-xs font-medium text-foreground md:text-sm">{step.step}</div>
              <p className="text-xs leading-5 text-muted-foreground md:text-sm">{step.text}</p>
              <CommandLines lines={step.lines} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="clients"
        badge="Client setup"
        title="Connect Codex, Claude, Cursor, Copilot, Antigravity, and any other stdio client"
        description="All clients converge on the same local bridge. Keep the command short, label the session, and enable project creation only when that session should be allowed to create a missing project."
      >
        <div className="space-y-6">
          {clientGuides.map((guide) => {
            const Icon = guide.icon;

            return (
              <div key={guide.name} className="space-y-2 border-b border-border pb-5 last:border-b-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
                    <Icon className="size-3" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{guide.eyebrow}</div>
                    <h3 className="text-sm font-medium text-foreground">{guide.name}</h3>
                    <p className="text-xs leading-5 text-muted-foreground">{guide.summary}</p>
                  </div>
                </div>

                <p className="text-xs leading-5 text-muted-foreground">{guide.configHint}</p>
                <CommandLines lines={guide.lines} />
                <NoteLines notes={guide.notes} />
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        id="workspace-model"
        badge="Workspace model"
        title="Keep the project board simple"
        description="The board is not a generic dashboard widget. It reflects the actual product rules."
      >
        <ul className="space-y-2">
          {workspaceFacts.map((fact) => (
            <li key={fact} className="text-xs leading-5 text-muted-foreground">
              {fact}
            </li>
          ))}
        </ul>
        <CommandLines
          lines={[
            'npx incontext-cli mcp serve --agent CODEX --label "Codex CLI"',
            'npx incontext-cli mcp serve --agent CLAUDE --label "Claude Code"',
            'npx incontext-cli mcp serve --agent CURSOR --label "Cursor"',
            'npx incontext-cli mcp serve --agent OTHER --label "GitHub Copilot"',
          ]}
        />
      </Section>

      <Section
        id="repo-docs"
        badge="Repo docs"
        title="Open the longer markdown when you need it"
        description="Use the in-app docs for the working path. Open the repository markdown when you want the fuller reference."
      >
        <div className="space-y-2">
          {repoDocs.map((doc) => (
            <Link
              key={doc.label}
              href={doc.href}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-foreground underline-offset-4 hover:underline md:text-sm"
            >
              {doc.label}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
