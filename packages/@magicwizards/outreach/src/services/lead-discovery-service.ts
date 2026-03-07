import type { OutreachContext } from "../context.js";
import type { DiscoveryResult, EnrichmentResult } from "../interfaces.js";
import type { OutreachLead, LeadStatus } from "../types.js";

// ─── Search adapters ────────────────────────────────────────────────────────

export async function searchInstagram(
  ctx: OutreachContext,
  params: { query: string; location?: string; count?: number },
): Promise<DiscoveryResult[]> {
  const { discovery } = ctx.adapters;
  if (!discovery.searchInstagram) {
    throw new Error("Instagram search is not configured in the discovery adapter");
  }
  return discovery.searchInstagram(params.query, params.location, params.count);
}

export async function searchGoogleMaps(
  ctx: OutreachContext,
  params: { query: string; location?: string; radius?: number },
): Promise<DiscoveryResult[]> {
  const { discovery } = ctx.adapters;
  if (!discovery.searchGoogleMaps) {
    throw new Error("Google Maps search is not configured in the discovery adapter");
  }
  return discovery.searchGoogleMaps(params.query, params.location, params.radius);
}

export async function searchWeb(
  ctx: OutreachContext,
  params: { query: string; count?: number },
): Promise<DiscoveryResult[]> {
  const { discovery } = ctx.adapters;
  if (!discovery.searchWeb) {
    throw new Error("Web search is not configured in the discovery adapter");
  }
  return discovery.searchWeb(params.query, params.count);
}

export async function enrichContact(
  ctx: OutreachContext,
  params: { name?: string; domain?: string; company?: string },
): Promise<EnrichmentResult | null> {
  const { discovery } = ctx.adapters;
  if (!discovery.enrichContact) {
    throw new Error("Contact enrichment is not configured in the discovery adapter");
  }
  return discovery.enrichContact(params);
}

// ─── Lead persistence ───────────────────────────────────────────────────────

export async function saveLeads(
  ctx: OutreachContext,
  params: {
    campaignId: string;
    tenantId: string;
    leads: Array<{
      firstName?: string;
      lastName?: string;
      email: string;
      phone?: string;
      businessName?: string;
      source: OutreachLead["source"];
      sourceUrl?: string;
      sourceMetadata?: Record<string, unknown>;
      personalizationContext?: Record<string, unknown>;
    }>;
  },
): Promise<OutreachLead[]> {
  if (params.leads.length === 0) return [];

  // Deduplicate by email within the batch
  const seen = new Set<string>();
  const deduped = params.leads.filter((lead) => {
    const key = lead.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return ctx.repos.leads.saveMany({
    campaignId: params.campaignId,
    tenantId: params.tenantId,
    leads: deduped,
  });
}

export async function listLeads(
  ctx: OutreachContext,
  params: {
    campaignId: string;
    tenantId: string;
    status?: LeadStatus;
    limit?: number;
    offset?: number;
  },
): Promise<OutreachLead[]> {
  return ctx.repos.leads.list(params.campaignId, params.tenantId, {
    status: params.status,
    limit: params.limit,
    offset: params.offset,
  });
}
