import type { Request, Response } from "express";

import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createInContextMcpServer } from "@/mcp/server-factory";

const app = createMcpExpressApp();

function getAllowedOrigins() {
  return (process.env.MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]) {
  if (allowedOrigins.length === 0 || !origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

function getBearerToken(req: Request) {
  const authHeader = req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function enforceMcpAccess(req: Request, res: Response) {
  const requiredToken = process.env.MCP_AUTH_TOKEN?.trim();
  const allowedOrigins = getAllowedOrigins();
  const origin = req.header("origin");

  if (!isOriginAllowed(origin, allowedOrigins)) {
    res.status(403).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Origin not allowed.",
      },
      id: null,
    });

    return false;
  }

  if (!requiredToken) {
    return true;
  }

  const providedToken = getBearerToken(req);

  if (providedToken === requiredToken) {
    return true;
  }

  res.status(401).json({
    jsonrpc: "2.0",
    error: {
      code: -32001,
      message: "Unauthorized.",
    },
    id: null,
  });

  return false;
}

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "incontext-mcp" });
});

app.post("/mcp", async (req: Request, res: Response) => {
  if (!enforceMcpAccess(req, res)) {
    return;
  }

  const server = createInContextMcpServer();

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    console.error("Error handling MCP HTTP request:", error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
});

app.delete("/mcp", async (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
});

const port = Number(process.env.PORT ?? process.env.MCP_PORT ?? "8787");

app.listen(port, (error?: Error) => {
  if (error) {
    console.error("Failed to start MCP HTTP server:", error);
    process.exit(1);
  }

  console.log(`InContext MCP HTTP server listening on port ${port}`);
});
