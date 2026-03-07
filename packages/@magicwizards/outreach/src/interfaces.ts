import type { LeadSource } from "./types.js";

// ─── Email sender adapter ───────────────────────────────────────────────────

/** Sends an email via the host app's email service. */
export interface EmailSender {
  send(params: {
    to: string;
    from: string | { email: string; name: string };
    subject: string;
    html: string;
    text?: string;
    trackOpens?: boolean;
    trackClicks?: boolean;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

// ─── Discovery adapter ──────────────────────────────────────────────────────

/**
 * Calls external discovery endpoints (Pipedream HTTP workflows, direct APIs,
 * or any other source). All methods are optional — the package gracefully
 * handles missing capabilities.
 */
export interface DiscoveryAdapter {
  searchInstagram?(
    query: string,
    location?: string,
    count?: number,
  ): Promise<DiscoveryResult[]>;

  searchGoogleMaps?(
    query: string,
    location?: string,
    radius?: number,
  ): Promise<DiscoveryResult[]>;

  searchWeb?(
    query: string,
    count?: number,
  ): Promise<DiscoveryResult[]>;

  enrichContact?(params: {
    name?: string;
    domain?: string;
    company?: string;
  }): Promise<EnrichmentResult | null>;
}

export interface DiscoveryResult {
  businessName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  website?: string;
  source: LeadSource;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface EnrichmentResult {
  email?: string;
  phone?: string;
  linkedIn?: string;
  title?: string;
  company?: string;
  confidence?: number;
}

// ─── Task scheduler adapter ─────────────────────────────────────────────────

/** Creates a scheduled task in the host app's scheduler. */
export interface TaskScheduler {
  createTask(params: {
    id: string;
    cron: string;
    prompt: string;
    description: string;
  }): Promise<{ taskId: string }>;

  deleteTask(taskId: string): Promise<void>;
}

// ─── CRM promoter adapter ───────────────────────────────────────────────────

/** Promotes a lead to the host app's CRM system. */
export interface CrmPromoter {
  createContact(params: {
    tenantId: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    company?: string;
    source: string;
  }): Promise<{ contactId: string }>;

  createDeal(params: {
    tenantId: string;
    contactId: string;
    title: string;
    value?: number;
    source: string;
  }): Promise<{ dealId: string }>;
}
