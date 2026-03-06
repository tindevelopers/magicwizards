/**
 * Lightweight web-search MCP server (HTTP JSON-RPC).
 * Uses Google Custom Search API or SerpAPI. Configure via env:
 * - GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX, or
 * - SERPAPI_KEY
 */
import express from "express";

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT ?? "8080", 10);

async function webSearch(query: string, num: number = 5): Promise<string> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY ?? process.env.SERPAPI_KEY;
  if (!apiKey) {
    return "Web search not configured (missing GOOGLE_CSE_API_KEY or SERPAPI_KEY).";
  }

  if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX) {
    const cx = process.env.GOOGLE_CSE_CX;
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${Math.min(num, 10)}`
    );
    const data = (await res.json()) as Record<string, unknown>;
    const items = (data.items as Array<Record<string, unknown>>) ?? [];
    if (items.length === 0) return "No results found.";
    return items
      .map((i, idx) => `${idx + 1}. ${i.title ?? ""}\n   ${i.link ?? ""}\n   ${i.snippet ?? ""}`)
      .join("\n\n");
  }

  if (process.env.SERPAPI_KEY) {
    const res = await fetch(
      `https://serpapi.com/search.json?api_key=${apiKey}&q=${encodeURIComponent(query)}&num=${num}`
    );
    const data = (await res.json()) as Record<string, unknown>;
    const items = (data.organic_results as Array<Record<string, unknown>>) ?? [];
    if (items.length === 0) return "No results found.";
    return items
      .map((i, idx) => `${idx + 1}. ${i.title ?? ""}\n   ${i.link ?? ""}\n   ${i.snippet ?? ""}`)
      .join("\n\n");
  }

  return "Web search not configured.";
}

app.post("/", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const method = body.method as string | undefined;
  const params = (body.params ?? {}) as Record<string, unknown>;
  const id = body.id;

  if (method === "tools/call") {
    const name = params.name as string;
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    try {
      if (name === "search") {
        const query = String(args.query ?? "");
        const num = Number(args.num ?? 5) || 5;
        const text = await webSearch(query, num);
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text }],
            isError: false,
          },
        });
      } else {
        res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        });
      }
    } catch (err) {
      res.json({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : "Internal error",
        },
      });
    }
    return;
  }

  if (method === "tools/list") {
    res.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "search",
            description: "Search the web for information",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query" },
                num: { type: "number", description: "Number of results (default 5)" },
              },
              required: ["query"],
            },
          },
        ],
      },
    });
    return;
  }

  res.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "web-search-mcp" });
});

app.listen(PORT, () => {
  console.log(`web-search-mcp listening on port ${PORT}`);
});
