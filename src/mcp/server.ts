import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createInContextMcpServer } from "@/mcp/server-factory";

async function main() {
  const server = createInContextMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("InContext MCP server is running on stdio.");
}

main().catch((error) => {
  console.error("InContext MCP server failed to start:", error);
  process.exit(1);
});
