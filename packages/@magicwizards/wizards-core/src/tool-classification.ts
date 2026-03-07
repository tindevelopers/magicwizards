import type { ToolRiskLevel } from "./types.js";

/**
 * Static classification of known MCP tool names to risk levels.
 *
 * Convention: keys use the pattern "mcpServerName/toolName".
 * Unknown tools default to "write" (safe-by-default -- require approval).
 */
const TOOL_RISK_REGISTRY: Record<string, ToolRiskLevel> = {
  // Google Workspace
  "google-workspace/search_emails": "read",
  "google-workspace/read_email": "read",
  "google-workspace/send_email": "write",
  "google-workspace/list_events": "read",
  "google-workspace/create_event": "write",
  "google-workspace/search_drive": "read",

  // Web Search
  "web-search/search": "read",

  // HubSpot CRM
  "hubspot/search_contacts": "read",
  "hubspot/get_contact": "read",
  "hubspot/create_contact": "write",
  "hubspot/update_contact": "write",
  "hubspot/delete_contact": "destructive",
  "hubspot/create_company": "write",
  "hubspot/get_activities": "read",

  // Telephony (unified adapter)
  "telephony/make_call": "write",
  "telephony/schedule_call": "write",
  "telephony/send_sms": "write",
  "telephony/list_calls": "read",
  "telephony/call_control": "write",

  // Microsoft 365 Mail (Outlook via Graph API)
  "microsoft-365-mail/search_messages": "read",
  "microsoft-365-mail/read_message": "read",
  "microsoft-365-mail/send_message": "write",
  "microsoft-365-mail/reply_to_message": "write",
  "microsoft-365-mail/update_message": "write",
  "microsoft-365-mail/delete_message": "destructive",
  "microsoft-365-mail/list_messages": "read",

  // Salesforce
  "salesforce/search_leads": "read",
  "salesforce/create_lead": "write",
  "salesforce/update_lead": "write",
  "salesforce/delete_lead": "destructive",
  "salesforce/search_contacts": "read",
  "salesforce/create_contact": "write",
  "salesforce/get_opportunities": "read",
  "salesforce/create_opportunity": "write",
  "salesforce/run_report": "read",

  // Lead Discovery (outreach)
  "lead-discovery/search_instagram": "read",
  "lead-discovery/search_google_maps": "read",
  "lead-discovery/search_web": "read",
  "lead-discovery/enrich_contact": "read",
  "lead-discovery/save_leads": "write",
  "lead-discovery/list_leads": "read",

  // Email Outreach (outreach)
  "email-outreach/send_outreach_email": "write",
  "email-outreach/send_campaign_batch": "write",
  "email-outreach/preview_email": "read",
  "email-outreach/check_email_status": "read",
  "email-outreach/handle_reply": "write",

  // Campaign Tracker (outreach)
  "campaign-tracker/create_campaign": "write",
  "campaign-tracker/get_campaign": "read",
  "campaign-tracker/list_campaigns": "read",
  "campaign-tracker/update_campaign_status": "write",
  "campaign-tracker/get_pipeline_summary": "read",
  "campaign-tracker/create_sequence": "write",
  "campaign-tracker/list_sequences": "read",
  "campaign-tracker/promote_to_crm": "write",
  "campaign-tracker/schedule_campaign": "write",
  "campaign-tracker/get_due_followups": "read",
};

/**
 * Classify an MCP tool by risk level.
 *
 * @param mcpServer - The MCP server name (e.g. "google-workspace")
 * @param toolName  - The tool name (e.g. "send_email")
 * @returns The risk classification. Unknown tools default to "write".
 */
export function classifyTool(
  mcpServer: string,
  toolName: string,
): ToolRiskLevel {
  return TOOL_RISK_REGISTRY[`${mcpServer}/${toolName}`] ?? "write";
}

/**
 * Check whether a tool call requires approval based on the plan's approval mode
 * and the tool's risk level.
 */
export function requiresApproval(
  riskLevel: ToolRiskLevel,
  approvalMode: "always" | "writes-only" | "never",
): boolean {
  switch (approvalMode) {
    case "never":
      return false;
    case "writes-only":
      return riskLevel === "write" || riskLevel === "destructive";
    case "always":
      return riskLevel !== "read";
    default:
      return true;
  }
}

/**
 * Check whether a tool is completely blocked (destructive ops in restricted plans).
 */
export function isToolBlocked(riskLevel: ToolRiskLevel): boolean {
  return riskLevel === "destructive";
}

/**
 * Register or override a tool classification at runtime.
 * Useful for tenant-provided MCP servers where we don't know tools ahead of time.
 */
export function registerToolClassification(
  mcpServer: string,
  toolName: string,
  riskLevel: ToolRiskLevel,
): void {
  TOOL_RISK_REGISTRY[`${mcpServer}/${toolName}`] = riskLevel;
}
