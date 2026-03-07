/**
 * Adapter implementations that wire @magicwizards/outreach interfaces
 * to this application's specific services (email, Pipedream, scheduler, CRM).
 */
import { logger } from "../logger.js";
import type {
  EmailSender,
  DiscoveryAdapter,
  DiscoveryResult,
  EnrichmentResult,
  TaskScheduler,
  CrmPromoter,
} from "@magicwizards/outreach";

// ─── Email sender adapter ──────────────────────────────────────────────────

/**
 * Wraps a generic email-sending function into the EmailSender interface.
 * The consuming app provides the actual send implementation (Resend, SendGrid, etc.).
 */
export function createEmailSenderAdapter(config: {
  sendFn?: (params: {
    to: string;
    from: string | { email: string; name: string };
    subject: string;
    html: string;
    text?: string;
  }) => Promise<{ success: boolean; messageId?: string; error?: string }>;
}): EmailSender {
  return {
    async send(params) {
      if (!config.sendFn) {
        logger.warn("email_sender_not_configured", {
          to: params.to,
          subject: params.subject,
        });
        return { success: false, error: "Email sender not configured" };
      }
      try {
        return await config.sendFn({
          to: params.to,
          from: params.from,
          subject: params.subject,
          html: params.html,
          text: params.text,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown send error";
        logger.error("email_send_failed", { to: params.to, error: message });
        return { success: false, error: message };
      }
    },
  };
}

// ─── Discovery adapter (Pipedream endpoints) ───────────────────────────────

export function createDiscoveryAdapter(config: {
  instagramUrl?: string;
  googleMapsUrl?: string;
  webSearchUrl?: string;
  enrichmentUrl?: string;
}): DiscoveryAdapter {
  return {
    searchInstagram: config.instagramUrl
      ? async (query, location, count) => {
          const res = await fetch(config.instagramUrl!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, location, count: count ?? 20 }),
          });
          if (!res.ok) throw new Error(`Instagram search failed: ${res.status}`);
          return (await res.json()) as DiscoveryResult[];
        }
      : undefined,

    searchGoogleMaps: config.googleMapsUrl
      ? async (query, location, radius) => {
          const res = await fetch(config.googleMapsUrl!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, location, radius: radius ?? 5000 }),
          });
          if (!res.ok) throw new Error(`Google Maps search failed: ${res.status}`);
          return (await res.json()) as DiscoveryResult[];
        }
      : undefined,

    searchWeb: config.webSearchUrl
      ? async (query, count) => {
          const res = await fetch(config.webSearchUrl!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, count: count ?? 10 }),
          });
          if (!res.ok) throw new Error(`Web search failed: ${res.status}`);
          return (await res.json()) as DiscoveryResult[];
        }
      : undefined,

    enrichContact: config.enrichmentUrl
      ? async (params) => {
          const res = await fetch(config.enrichmentUrl!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
          });
          if (!res.ok) return null;
          return (await res.json()) as EnrichmentResult;
        }
      : undefined,
  };
}

// ─── Task scheduler adapter ────────────────────────────────────────────────

/**
 * Wraps the host app's scheduled task system.
 * In wizards-api this could call the scheduler service directly.
 */
export function createSchedulerAdapter(config?: {
  createFn?: (params: {
    id: string;
    cron: string;
    prompt: string;
    description: string;
  }) => Promise<{ taskId: string }>;
  deleteFn?: (taskId: string) => Promise<void>;
}): TaskScheduler {
  return {
    async createTask(params) {
      if (!config?.createFn) {
        logger.warn("scheduler_not_configured", { taskId: params.id });
        return { taskId: params.id };
      }
      return config.createFn(params);
    },
    async deleteTask(taskId) {
      if (!config?.deleteFn) {
        logger.warn("scheduler_delete_not_configured", { taskId });
        return;
      }
      return config.deleteFn(taskId);
    },
  };
}

// ─── CRM promoter adapter ──────────────────────────────────────────────────

/**
 * Wraps the host app's CRM service (HubSpot, Salesforce, etc.)
 * for promoting outreach leads to CRM contacts and deals.
 */
export function createCrmAdapter(config?: {
  createContactFn?: (params: {
    tenantId: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    company?: string;
    source: string;
  }) => Promise<{ contactId: string }>;
  createDealFn?: (params: {
    tenantId: string;
    contactId: string;
    title: string;
    value?: number;
    source: string;
  }) => Promise<{ dealId: string }>;
}): CrmPromoter {
  return {
    async createContact(params) {
      if (!config?.createContactFn) {
        // Generate a placeholder contact ID when CRM is not configured
        return { contactId: `local-${crypto.randomUUID()}` };
      }
      return config.createContactFn(params);
    },
    async createDeal(params) {
      if (!config?.createDealFn) {
        return { dealId: `local-${crypto.randomUUID()}` };
      }
      return config.createDealFn(params);
    },
  };
}
