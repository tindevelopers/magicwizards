/**
 * Factory that assembles a fully-wired OutreachContext for this application.
 *
 * This is the single wiring point — changing email providers, CRM backends,
 * or discovery services is a one-line swap here.
 */
import type { OutreachContext } from "@magicwizards/outreach";
import {
  createSupabaseCampaignRepo,
  createSupabaseSequenceRepo,
  createSupabaseLeadRepo,
  createSupabaseEmailLogRepo,
  createSupabaseEmailProviderRepo,
} from "./supabase-repositories.js";
import {
  createEmailSenderAdapter,
  createDiscoveryAdapter,
  createSchedulerAdapter,
  createCrmAdapter,
} from "./adapters.js";

/**
 * Create an OutreachContext wired to this app's Supabase repos + adapters.
 *
 * @param _tenantId – currently unused but available for tenant-specific
 *   adapter configuration in the future (e.g. per-tenant Pipedream URLs).
 */
export function createOutreachContext(_tenantId: string): OutreachContext {
  return {
    repos: {
      campaigns: createSupabaseCampaignRepo(),
      sequences: createSupabaseSequenceRepo(),
      leads: createSupabaseLeadRepo(),
      emailLog: createSupabaseEmailLogRepo(),
      emailProvider: createSupabaseEmailProviderRepo(),
    },
    adapters: {
      emailSender: createEmailSenderAdapter({
        // TODO: wire to tenant's configured email provider (Resend, SendGrid, etc.)
        // For now, email sending is a no-op until the tenant configures a provider.
        sendFn: undefined,
      }),
      discovery: createDiscoveryAdapter({
        instagramUrl: process.env.PIPEDREAM_INSTAGRAM_SEARCH_URL,
        googleMapsUrl: process.env.PIPEDREAM_GOOGLE_MAPS_SEARCH_URL,
        webSearchUrl: process.env.PIPEDREAM_WEB_SEARCH_URL,
        enrichmentUrl: process.env.PIPEDREAM_CONTACT_ENRICHMENT_URL,
      }),
      scheduler: createSchedulerAdapter(),
      crm: createCrmAdapter(),
    },
  };
}
