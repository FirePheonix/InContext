import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createContextHubMcpServer } from "@/mcp/server-factory";

async function main() {
  const server = createContextHubMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Context Hub MCP server is running on stdio.");
}

main().catch((error) => {
  console.error("Context Hub MCP server failed to start:", error);
  process.exit(1);
});
