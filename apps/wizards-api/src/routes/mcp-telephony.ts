/**
 * Built-in MCP endpoint for telephony tools.
 * Exposed at /mcp/telephony/:tenantId so the agent can call make_call, send_sms, etc.
 * Tenant ID in path enables credential resolution without custom MCP protocol extensions.
 */
import { Router } from "express";
import { executeTelephonyTool } from "../services/telephony-adapter.js";
import type { TelephonyToolName } from "../services/telephony-adapter.js";

const TELEPHONY_TOOLS = [
  {
    name: "make_call",
    description: "Place an outbound voice call. Provide 'to' (phone number), optional 'from', optional 'assistant_prompt' for AI voice.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Destination phone number (E.164)" },
        from: { type: "string", description: "Caller ID (optional)" },
        assistant_prompt: { type: "string", description: "Instructions for AI voice agent (optional)" },
      },
      required: ["to"],
    },
  },
  {
    name: "schedule_call",
    description: "Schedule a call for later.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string" },
        scheduled_at: { type: "string", description: "ISO 8601 datetime" },
        from: { type: "string" },
        assistant_prompt: { type: "string" },
      },
      required: ["to", "scheduled_at"],
    },
  },
  {
    name: "send_sms",
    description: "Send an SMS message.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string" },
        body: { type: "string" },
        from: { type: "string" },
      },
      required: ["to", "body"],
    },
  },
  {
    name: "list_calls",
    description: "List recent calls.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "call_control",
    description: "Transfer, hangup, or send DTMF to an active call.",
    inputSchema: {
      type: "object",
      properties: {
        call_id: { type: "string" },
        action: { type: "string", enum: ["transfer", "hangup", "dtmf"] },
        target: { type: "string" },
      },
      required: ["call_id", "action"],
    },
  },
];

export function createMcpTelephonyRouter(): Router {
  const router = Router({ mergeParams: true });

  router.post("/", async (req, res) => {
    const tenantId = (req.params as { tenantId?: string }).tenantId;
    if (!tenantId) {
      res.status(400).json({
        jsonrpc: "2.0",
        id: (req.body as Record<string, unknown>).id,
        error: { code: -32600, message: "Missing tenantId in path" },
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const method = body.method as string | undefined;
    const params = (body.params ?? {}) as Record<string, unknown>;
    const id = body.id;

    if (method === "tools/list") {
      res.json({
        jsonrpc: "2.0",
        id,
        result: { tools: TELEPHONY_TOOLS },
      });
      return;
    }

    if (method === "tools/call") {
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const userId = (req.headers["x-user-id"] as string) || undefined;

      const validTools: TelephonyToolName[] = [
        "make_call",
        "schedule_call",
        "send_sms",
        "list_calls",
        "call_control",
      ];
      if (!validTools.includes(name as TelephonyToolName)) {
        res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        });
        return;
      }

      try {
        const result = await executeTelephonyTool({
          tenantId,
          userId,
          toolName: name as TelephonyToolName,
          args,
        });
        const text =
          typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2);
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text }],
            isError: false,
          },
        });
      } catch (err) {
        res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32603,
            message: err instanceof Error ? err.message : "Telephony call failed",
          },
        });
      }
      return;
    }

    res.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  });

  return router;
}
