/**
 * MCP router for lead discovery tools.
 * Exposes search_instagram, search_google_maps, search_web, enrich_contact,
 * save_leads, and list_leads via JSON-RPC 2.0.
 */
import { Router } from "express";
import type { OutreachContext } from "../context.js";
import {
  searchInstagram,
  searchGoogleMaps,
  searchWeb,
  enrichContact,
  saveLeads,
  listLeads,
} from "../services/lead-discovery-service.js";
import type { LeadSource, LeadStatus } from "../types.js";

const LEAD_DISCOVERY_TOOLS = [
  {
    name: "search_instagram",
    description:
      "Search Instagram for businesses matching query and location. Returns business profiles with contact info.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'wedding planners')",
        },
        location: {
          type: "string",
          description: "Location filter (e.g., 'Austin, TX')",
        },
        count: {
          type: "number",
          description: "Max results to return (default: 20)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_google_maps",
    description:
      "Search Google Maps for businesses matching query and location. Returns listings with addresses and contact info.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'event planners')",
        },
        location: {
          type: "string",
          description: "Location center (e.g., 'Austin, TX')",
        },
        radius: {
          type: "number",
          description: "Search radius in km (default: 50)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_web",
    description:
      "Search the web for potential leads matching query. Returns business info extracted from search results.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        count: {
          type: "number",
          description: "Max results (default: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "enrich_contact",
    description:
      "Enrich a contact with email, phone, LinkedIn via data providers (e.g., Hunter.io, Apollo).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Person's full name" },
        domain: { type: "string", description: "Company website domain" },
        company: { type: "string", description: "Company name" },
      },
    },
  },
  {
    name: "save_leads",
    description:
      "Save discovered leads to the campaign's lead list. Deduplicates by email.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Campaign ID" },
        leads: {
          type: "array",
          description: "Array of lead objects to save",
          items: {
            type: "object",
            properties: {
              first_name: { type: "string" },
              last_name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              business_name: { type: "string" },
              source: {
                type: "string",
                enum: [
                  "instagram",
                  "google_maps",
                  "web_search",
                  "enrichment",
                  "manual",
                  "import",
                ],
              },
              source_url: { type: "string" },
              source_metadata: { type: "object" },
              personalization_context: { type: "object" },
            },
            required: ["email", "source"],
          },
        },
      },
      required: ["campaign_id", "leads"],
    },
  },
  {
    name: "list_leads",
    description:
      "List leads for a campaign with optional status filter and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Campaign ID" },
        status: {
          type: "string",
          description: "Filter by status",
          enum: [
            "discovered",
            "enriched",
            "contacted",
            "opened",
            "replied",
            "interested",
            "qualified",
            "converted",
            "unsubscribed",
            "bounced",
            "invalid",
          ],
        },
        limit: { type: "number", description: "Max results (default: 50)" },
        offset: { type: "number", description: "Offset for pagination" },
      },
      required: ["campaign_id"],
    },
  },
];

type LeadDiscoveryToolName =
  | "search_instagram"
  | "search_google_maps"
  | "search_web"
  | "enrich_contact"
  | "save_leads"
  | "list_leads";

const VALID_TOOLS: LeadDiscoveryToolName[] = [
  "search_instagram",
  "search_google_maps",
  "search_web",
  "enrich_contact",
  "save_leads",
  "list_leads",
];

export function createLeadDiscoveryMcpRouter(
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
        result: { tools: LEAD_DISCOVERY_TOOLS },
      });
      return;
    }

    if (method === "tools/call") {
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;

      if (!VALID_TOOLS.includes(name as LeadDiscoveryToolName)) {
        res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        });
        return;
      }

      try {
        const ctx = getContext(tenantId);
        const result = await executeLeadDiscoveryTool(
          ctx,
          tenantId,
          name as LeadDiscoveryToolName,
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
              err instanceof Error ? err.message : "Lead discovery call failed",
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

async function executeLeadDiscoveryTool(
  ctx: OutreachContext,
  tenantId: string,
  toolName: LeadDiscoveryToolName,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case "search_instagram":
      return searchInstagram(ctx, {
        query: args.query as string,
        location: args.location as string | undefined,
        count: args.count as number | undefined,
      });

    case "search_google_maps":
      return searchGoogleMaps(ctx, {
        query: args.query as string,
        location: args.location as string | undefined,
        radius: args.radius as number | undefined,
      });

    case "search_web":
      return searchWeb(ctx, {
        query: args.query as string,
        count: args.count as number | undefined,
      });

    case "enrich_contact":
      return enrichContact(ctx, {
        name: args.name as string | undefined,
        domain: args.domain as string | undefined,
        company: args.company as string | undefined,
      });

    case "save_leads": {
      const rawLeads = args.leads as Array<Record<string, unknown>>;
      return saveLeads(ctx, {
        campaignId: args.campaign_id as string,
        tenantId,
        leads: rawLeads.map((l) => ({
          firstName: l.first_name as string | undefined,
          lastName: l.last_name as string | undefined,
          email: l.email as string,
          phone: l.phone as string | undefined,
          businessName: l.business_name as string | undefined,
          source: l.source as LeadSource,
          sourceUrl: l.source_url as string | undefined,
          sourceMetadata: l.source_metadata as
            | Record<string, unknown>
            | undefined,
          personalizationContext: l.personalization_context as
            | Record<string, unknown>
            | undefined,
        })),
      });
    }

    case "list_leads":
      return listLeads(ctx, {
        campaignId: args.campaign_id as string,
        tenantId,
        status: args.status as LeadStatus | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
  }
}
