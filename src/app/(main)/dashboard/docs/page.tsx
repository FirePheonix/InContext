import Link from "next/link";

import { BookOpenText, Cloud, Command, Rocket, TerminalSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const docCards = [
  {
    title: "Getting Started",
    description: "Set up the app locally, configure envs, and run the dashboard plus local MCP flow.",
    icon: Rocket,
    points: [
      "Install dependencies and copy .env.example to .env",
      "Run Prisma migrations against your Postgres database",
      "Start the Next.js app and sign in through GitHub or Google",
    ],
    commands: ["npm install", "npm run db:migrate", "npm run dev"],
  },
  {
    title: "CLI Workflow",
    description: "Use the individual-user flow: login, link a project, save handoffs, resume, and run MCP locally.",
    icon: TerminalSquare,
    points: [
      "Browser-assisted CLI login stores a local device token",
      "Link the current repo to a project slug before agent work",
      "Resume hashes restore the current project context later",
    ],
    commands: [
      "npx incontext-cli login --app-url https://in-context-gamma.vercel.app",
      "npx incontext-cli project link <your-project-slug>",
      "npx incontext-cli mcp serve",
    ],
  },
  {
    title: "MCP Setup",
    description: "Connect Codex, Claude Code, or Cursor to the local InContext bridge.",
    icon: Command,
    points: [
      "Add the local stdio MCP command in your client config",
      "The local MCP server reads and writes cloud-backed project context",
      "Git execution stays on the local machine through the linked repo",
    ],
    commands: ['command = "npx"', 'args = ["incontext-cli", "mcp", "serve"]'],
  },
  {
    title: "Deploy",
    description: "Run the web app on Vercel, the optional HTTP MCP server on Railway, and PostgreSQL on Neon.",
    icon: Cloud,
    points: [
      "Vercel hosts the app and applies Prisma migrations during build",
      "Railway hosts the optional HTTP MCP endpoint",
      "Both services share the same PostgreSQL database",
    ],
    commands: ["npm run vercel-build", "npm run mcp:http"],
  },
] as const;

const sidebarDocs = [
  { label: "README", href: "https://github.com/FirePheonix/InContext/blob/main/README.md" },
  { label: "CLI Guide", href: "https://github.com/FirePheonix/InContext/blob/main/CLI.md" },
  { label: "Deploy Guide", href: "https://github.com/FirePheonix/InContext/blob/main/DEPLOY.md" },
  { label: "Contributing", href: "https://github.com/FirePheonix/InContext/blob/main/CONTRIBUTING.md" },
] as const;

export default function Page() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit">
            In-App Docs
          </Badge>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl tracking-tight">Documentation</h1>
            <p className="max-w-3xl text-muted-foreground">
              The repo docs are now surfaced in the product. Use this page for the setup path, CLI workflow, MCP wiring,
              and deployment shape you actually need while working with InContext.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {docCards.map((card) => (
            <Card key={card.title} className="shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <card.icon className="size-4 text-muted-foreground" />
                  <span>{card.title}</span>
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {card.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <pre className="overflow-x-auto text-xs leading-relaxed">{card.commands.join("\n")}</pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpenText className="size-4 text-muted-foreground" />
              Repo Docs
            </CardTitle>
            <CardDescription>Open the canonical markdown files from the GitHub repo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {sidebarDocs.map((doc) => (
              <Button key={doc.label} variant="outline" className="justify-start" asChild>
                <Link href={doc.href} target="_blank" rel="noreferrer">
                  {doc.label}
                </Link>
              </Button>
            ))}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Use this page for the fast product path; use the repo docs when you need full detail.
            </p>
          </CardFooter>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>First Run</CardTitle>
            <CardDescription>Minimal sequence for a new developer or agent operator.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/40 p-3">
              <pre className="overflow-x-auto text-xs leading-relaxed">
                {[
                  "npm install",
                  "npm run dev",
                  "npx incontext-cli login --app-url https://in-context-gamma.vercel.app",
                  "npx incontext-cli projects",
                  "npx incontext-cli project link <your-project-slug>",
                  "npx incontext-cli mcp serve",
                ].join("\n")}
              </pre>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
