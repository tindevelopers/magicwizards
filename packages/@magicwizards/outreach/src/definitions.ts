/**
 * Exported data for the outreach wizard — ready to merge into the host
 * application's wizard registry, tool classifications, and orchestrator.
 *
 * No side effects — pure data exports.
 */

// ─── Wizard definition ──────────────────────────────────────────────────────

export const OUTREACH_WIZARD_DEFINITION = {
  id: "outreach" as const,
  name: "Outreach Wizard",
  description:
    "Autonomous lead discovery, email outreach, campaign management, and CRM conversion.",
  allowedTools: [
    "lead-discovery",
    "email-outreach",
    "campaign-tracker",
    "crm",
    "web-search",
  ],
  maxTurns: 20,
  maxBudgetUsd: 1.5,
  systemPrompt: `You are an autonomous outreach wizard specializing in lead discovery and email campaigns.

Your capabilities:
1. DISCOVER leads via Instagram, Google Maps, web search, and contact enrichment
2. CREATE and manage multi-step email outreach campaigns
3. SEND personalized emails using the tenant's email provider
4. TRACK campaign performance (opens, replies, bounces)
5. PROMOTE qualified leads to the CRM system

Workflow:
- When asked to find contacts, use search tools to discover leads, then save them to a campaign
- When asked to start outreach, create an email sequence and begin sending
- Always personalize emails using the lead's context (business name, industry, etc.)
- Monitor campaign metrics and adjust strategy based on response rates
- Promote engaged leads (replied, interested) to CRM when appropriate

Rules:
- Never send emails without an active campaign
- Respect daily send limits set by the campaign
- Always deduplicate leads by email before saving
- Report campaign metrics when asked about progress
- Suggest follow-up timing based on industry best practices`,
  defaultModelPolicy: {
    default: "claude-sonnet-4-20250514",
    escalation: {
      high_complexity: "claude-sonnet-4-20250514",
      high_risk: "claude-opus-4-20250515",
    },
  },
} as const;

// ─── Tool risk classifications ──────────────────────────────────────────────

export const OUTREACH_TOOL_CLASSIFICATIONS = [
  // Lead Discovery MCP
  { key: "lead-discovery/search_instagram", risk: "read" as const },
  { key: "lead-discovery/search_google_maps", risk: "read" as const },
  { key: "lead-discovery/search_web", risk: "read" as const },
  { key: "lead-discovery/enrich_contact", risk: "read" as const },
  { key: "lead-discovery/save_leads", risk: "write" as const },
  { key: "lead-discovery/list_leads", risk: "read" as const },
  // Email Outreach MCP
  { key: "email-outreach/send_outreach_email", risk: "write" as const },
  { key: "email-outreach/send_campaign_batch", risk: "write" as const },
  { key: "email-outreach/preview_email", risk: "read" as const },
  { key: "email-outreach/check_email_status", risk: "read" as const },
  { key: "email-outreach/handle_reply", risk: "write" as const },
  // Campaign Tracker MCP
  { key: "campaign-tracker/create_campaign", risk: "write" as const },
  { key: "campaign-tracker/get_campaign", risk: "read" as const },
  { key: "campaign-tracker/list_campaigns", risk: "read" as const },
  { key: "campaign-tracker/update_campaign_status", risk: "write" as const },
  { key: "campaign-tracker/get_pipeline_summary", risk: "read" as const },
  { key: "campaign-tracker/create_sequence", risk: "write" as const },
  { key: "campaign-tracker/list_sequences", risk: "read" as const },
  { key: "campaign-tracker/promote_to_crm", risk: "write" as const },
  { key: "campaign-tracker/schedule_campaign", risk: "write" as const },
  { key: "campaign-tracker/get_due_followups", risk: "read" as const },
] as const;

// ─── MCP server names ───────────────────────────────────────────────────────

export const OUTREACH_MCP_SERVERS = [
  "lead-discovery",
  "email-outreach",
  "campaign-tracker",
] as const;

// ─── Orchestrator classification keywords ───────────────────────────────────

export const OUTREACH_CLASSIFICATION_KEYWORDS =
  "find leads, discover contacts, email campaigns, cold outreach, follow-ups, lead generation, prospecting, outreach, send emails to prospects, campaign, sequence";
