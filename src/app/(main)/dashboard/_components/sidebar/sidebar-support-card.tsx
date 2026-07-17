import Link from "next/link";

import { siNpm } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SidebarSupportCard() {
  return (
    <Card size="sm" className="overflow-hidden shadow-none group-data-[collapsible=icon]:hidden">
      <CardHeader className="min-w-0 px-4">
        <CardTitle className="truncate text-sm">CLI + MCP</CardTitle>
        <CardDescription className="line-clamp-2">
          Install the local bridge from&nbsp;
          <Link
            href="https://www.npmjs.com/package/incontext-cli"
            target="_blank"
            rel="noreferrer"
            aria-label="Open incontext-cli on npm"
            className="inline-flex items-center text-foreground"
          >
            <SimpleIcon icon={siNpm} aria-hidden className="size-3 fill-current" />
          </Link>
          &nbsp;then run <span className="font-mono text-foreground">incontext mcp serve</span>.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
