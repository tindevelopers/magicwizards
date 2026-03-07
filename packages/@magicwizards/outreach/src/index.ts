// Types
export * from "./types.js";
export * from "./repositories.js";
export * from "./interfaces.js";
export * from "./context.js";

// Definitions & data
export * from "./definitions.js";
export { OUTREACH_MIGRATION_SQL, OUTREACH_RLS_POLICIES_SQL } from "./migration.js";

// MCP router factories
export { createLeadDiscoveryMcpRouter } from "./mcp/lead-discovery-mcp.js";
export { createEmailOutreachMcpRouter } from "./mcp/email-outreach-mcp.js";
export { createCampaignTrackerMcpRouter } from "./mcp/campaign-tracker-mcp.js";
export { createEmailWebhookRouter } from "./mcp/email-webhooks.js";

// Services (for direct use outside MCP)
export * from "./services/lead-discovery-service.js";
export * from "./services/email-outreach-service.js";
export * from "./services/campaign-service.js";
