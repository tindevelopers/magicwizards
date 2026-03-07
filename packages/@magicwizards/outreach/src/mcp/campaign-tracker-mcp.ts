/**
 * MCP router for campaign tracker tools.
 * Exposes campaign CRUD, sequence management, pipeline summary,
 * CRM promotion, scheduling, and follow-up tools via JSON-RPC 2.0.
 */
import { Router } from "express";
import type { OutreachContext } from "../context.js";
import type { CampaignStatus, SequenceCondition } from "../types.js";
import {
  createCampaign,
  getCampaign,
  listCampaigns,
  updateCampaignStatus,
  getPipelineSummary,
  createSequence,
  listSequences,
  promoteToCrm,
  scheduleCampaign,
  getDueFollowups,
} from "../services/campaign-service.js";

const CAMPAIGN_TRACKER_TOOLS = [
  {
    name: "create_campaign",
    description: "Create a new outreach campaign.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Campaign name" },
        target_industry: { type: "string", description: "Industry to target" },
        target_location: { type: "string", description: "Location to target" },
        target_criteria: { type: "object", description: "Additional targeting criteria" },
        from_email: { type: "string", description: "Sender email address" },
        from_name: { type: "string", description: "Sender display name" },
        daily_send_limit: { type: "number", description: "Max emails per day (default: 50)" },
        total_send_limit: { type: "number", description: "Max total emails (default: 1000)" },
      },
      required: ["name", "from_email", "from_name"],
    },
  },
  {
    name: "get_campaign",
    description: "Get campaign details including stats.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Campaign ID" },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "list_campaigns",
    description: "List all campaigns for the current tenant.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by status",
          enum: ["draft", "active", "paused", "completed", "cancelled"],
        },
      },
    },
  },
  {
    name: "update_campaign_status",
    description: "Update campaign status (activate, pause, complete, or cancel).",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Campaign ID" },
        status: {
          type: "string",
          description: "New status",
          enum: ["active", "paused", "completed", "cancelled"],
        },
      },
      required: ["campaign_id", "status"],
    },
  },
  {
    name: "get_pipeline_summary",
    description:
      "Get funnel metrics: discovered -> contacted -> opened -> replied -> converted counts.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Campaign ID" },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "create_sequence",
    description: "Add an email sequence step to a campaign.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Campaign ID" },
        step_number: { type: "number", description: "Step number (1-based)" },
        subject_template: {
          type: "string",
          description: "Email subject with {{variable}} placeholders",
        },
        body_template: {
          type: "string",
          description: "Email HTML body with {{variable}} placeholders",
        },
        delay_hours: {
          type: "number",
          description: "Hours to wait after previous step (0 for initial)",
        },
        condition: {
          type: "string",
          description: "When to send this step",
          enum: ["no_reply", "no_open", "always"],
        },
      },
      required: [
        "campaign_id",
        "step_number",
        "subject_template",
        "body_template",
        "delay_hours",
        "condition",
      ],
    },
  },
  {
    name: "list_sequences",
    description: "List all sequence steps for a campaign.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Campaign ID" },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "promote_to_crm",
    description:
      "Promote a qualified lead to the CRM by creating a contact and deal.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Lead ID to promote" },
        deal_title: { type: "string", description: "Title for the CRM deal" },
        deal_value: { type: "number", description: "Estimated deal value" },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "schedule_campaign",
    description:
      "Schedule automated campaign runs using a cron expression.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Campaign ID" },
        cron: {
          type: "string",
          description: "Cron expression (e.g., '0 9 * * 1-5' for weekdays at 9am)",
        },
      },
      required: ["campaign_id", "cron"],
    },
  },
  {
    name: "get_due_followups",
    description:
      "Get leads that are due for follow-up emails based on their next_action_at timestamp.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Campaign ID" },
      },
      required: ["campaign_id"],
    },
  },
];

type CampaignTrackerToolName =
  | "create_campaign"
  | "get_campaign"
  | "list_campaigns"
  | "update_campaign_status"
  | "get_pipeline_summary"
  | "create_sequence"
  | "list_sequences"
  | "promote_to_crm"
  | "schedule_campaign"
  | "get_due_followups";

const VALID_TOOLS: CampaignTrackerToolName[] = [
  "create_campaign",
  "get_campaign",
  "list_campaigns",
  "update_campaign_status",
  "get_pipeline_summary",
  "create_sequence",
  "list_sequences",
  "promote_to_crm",
  "schedule_campaign",
  "get_due_followups",
];

export function createCampaignTrackerMcpRouter(
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
    const userId = (req.headers["x-user-id"] as string) || undefined;

    if (method === "tools/list") {
      res.json({
        jsonrpc: "2.0",
        id,
        result: { tools: CAMPAIGN_TRACKER_TOOLS },
      });
      return;
    }

    if (method === "tools/call") {
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;

      if (!VALID_TOOLS.includes(name as CampaignTrackerToolName)) {
        res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        });
        return;
      }

      try {
        const ctx = getContext(tenantId);
        const result = await executeCampaignTrackerTool(
          ctx,
          tenantId,
          userId,
          name as CampaignTrackerToolName,
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
                : "Campaign tracker call failed",
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

async function executeCampaignTrackerTool(
  ctx: OutreachContext,
  tenantId: string,
  userId: string | undefined,
  toolName: CampaignTrackerToolName,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case "create_campaign":
      return createCampaign(ctx, {
        tenantId,
        userId: userId ?? "system",
        name: args.name as string,
        targetIndustry: args.target_industry as string | undefined,
        targetLocation: args.target_location as string | undefined,
        targetCriteria: args.target_criteria as Record<string, unknown> | undefined,
        fromEmail: args.from_email as string,
        fromName: args.from_name as string,
        dailySendLimit: args.daily_send_limit as number | undefined,
        totalSendLimit: args.total_send_limit as number | undefined,
      });

    case "get_campaign":
      return getCampaign(ctx, {
        id: args.campaign_id as string,
        tenantId,
      });

    case "list_campaigns":
      return listCampaigns(ctx, {
        tenantId,
        status: args.status as CampaignStatus | undefined,
      });

    case "update_campaign_status":
      return updateCampaignStatus(ctx, {
        id: args.campaign_id as string,
        tenantId,
        status: args.status as CampaignStatus,
      });

    case "get_pipeline_summary":
      return getPipelineSummary(ctx, {
        campaignId: args.campaign_id as string,
        tenantId,
      });

    case "create_sequence":
      return createSequence(ctx, {
        campaignId: args.campaign_id as string,
        stepNumber: args.step_number as number,
        subjectTemplate: args.subject_template as string,
        bodyTemplate: args.body_template as string,
        delayHours: args.delay_hours as number,
        condition: args.condition as SequenceCondition,
      });

    case "list_sequences":
      return listSequences(ctx, {
        campaignId: args.campaign_id as string,
      });

    case "promote_to_crm":
      return promoteToCrm(ctx, {
        leadId: args.lead_id as string,
        tenantId,
        dealTitle: args.deal_title as string | undefined,
        dealValue: args.deal_value as number | undefined,
      });

    case "schedule_campaign":
      return scheduleCampaign(ctx, {
        campaignId: args.campaign_id as string,
        tenantId,
        cron: args.cron as string,
      });

    case "get_due_followups":
      return getDueFollowups(ctx, {
        campaignId: args.campaign_id as string,
        tenantId,
      });
  }
}
