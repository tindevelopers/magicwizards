/**
 * MCP router for email outreach tools.
 * Exposes send_outreach_email, send_campaign_batch, preview_email,
 * check_email_status, and handle_reply via JSON-RPC 2.0.
 */
import { Router } from "express";
import type { OutreachContext } from "../context.js";
import {
  sendOutreachEmail,
  sendCampaignBatch,
  previewEmail,
  checkEmailStatus,
  handleReply,
} from "../services/email-outreach-service.js";

const EMAIL_OUTREACH_TOOLS = [
  {
    name: "send_outreach_email",
    description:
      "Send a single personalized outreach email to a lead using the campaign's sequence template and the tenant's email provider.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Lead ID to email" },
        campaign_id: { type: "string", description: "Campaign ID" },
      },
      required: ["lead_id", "campaign_id"],
    },
  },
  {
    name: "send_campaign_batch",
    description:
      "Send the next batch of outreach emails for a campaign. Respects daily send limits and processes leads due for follow-up.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Campaign ID" },
        batch_size: {
          type: "number",
          description: "Max emails in this batch (default: 20)",
        },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "preview_email",
    description:
      "Preview an email with personalization applied. Does not send — returns the rendered subject and body.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Lead ID" },
        sequence_id: {
          type: "string",
          description: "Sequence step ID to preview",
        },
      },
      required: ["lead_id", "sequence_id"],
    },
  },
  {
    name: "check_email_status",
    description:
      "Check the delivery/open/bounce status of a sent outreach email.",
    inputSchema: {
      type: "object",
      properties: {
        email_id: { type: "string", description: "Outreach email log ID" },
      },
      required: ["email_id"],
    },
  },
  {
    name: "handle_reply",
    description:
      "Process an inbound reply to an outreach email. Updates the lead status to 'replied'.",
    inputSchema: {
      type: "object",
      properties: {
        message_id: {
          type: "string",
          description: "Email provider message ID from the reply",
        },
      },
      required: ["message_id"],
    },
  },
];

type EmailOutreachToolName =
  | "send_outreach_email"
  | "send_campaign_batch"
  | "preview_email"
  | "check_email_status"
  | "handle_reply";

const VALID_TOOLS: EmailOutreachToolName[] = [
  "send_outreach_email",
  "send_campaign_batch",
  "preview_email",
  "check_email_status",
  "handle_reply",
];

export function createEmailOutreachMcpRouter(
  getContext: (tenantId: string) => OutreachContext,
): Router {
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
        result: { tools: EMAIL_OUTREACH_TOOLS },
      });
      return;
    }

    if (method === "tools/call") {
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;

      if (!VALID_TOOLS.includes(name as EmailOutreachToolName)) {
        res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        });
        return;
      }

      try {
        const ctx = getContext(tenantId);
        const result = await executeEmailOutreachTool(
          ctx,
          tenantId,
          name as EmailOutreachToolName,
          args,
        );
        const text =
          typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2);
        res.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text }], isError: false },
        });
      } catch (err) {
        res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32603,
            message:
              err instanceof Error
                ? err.message
                : "Email outreach call failed",
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

// ─── Tool dispatch ──────────────────────────────────────────────────────────

async function executeEmailOutreachTool(
  ctx: OutreachContext,
  tenantId: string,
  toolName: EmailOutreachToolName,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case "send_outreach_email":
      return sendOutreachEmail(ctx, {
        leadId: args.lead_id as string,
        campaignId: args.campaign_id as string,
        tenantId,
      });

    case "send_campaign_batch":
      return sendCampaignBatch(ctx, {
        campaignId: args.campaign_id as string,
        tenantId,
        batchSize: args.batch_size as number | undefined,
      });

    case "preview_email":
      return previewEmail(ctx, {
        leadId: args.lead_id as string,
        sequenceId: args.sequence_id as string,
        tenantId,
      });

    case "check_email_status":
      return checkEmailStatus(ctx, {
        emailId: args.email_id as string,
      });

    case "handle_reply":
      return handleReply(ctx, {
        messageId: args.message_id as string,
      });
  }
}
