import { TerminalSquare } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";

export function FocusCard() {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Local Agent Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
            <div>incontext login</div>
            <div>incontext mcp serve</div>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground text-xs">
            <TerminalSquare className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Sign in once locally, then point Codex, Claude, or Cursor at the local MCP server to read and write
              cloud-backed project context.
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Kbd>npx</Kbd>
            <span>incontext-cli mcp serve</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
