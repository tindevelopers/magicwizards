/**
 * Supabase implementations of the outreach repository interfaces.
 *
 * These are the thin adapter layer that connects the @magicwizards/outreach
 * package to a Supabase backend. Other consumers can implement the same
 * interfaces with raw pg, Prisma, Drizzle, etc.
 */
import { getSupabaseAdminClient } from "../supabase.js";
import type {
  CampaignRepository,
  SequenceRepository,
  LeadRepository,
  EmailLogRepository,
  EmailProviderRepository,
  OutreachCampaign,
  OutreachSequence,
  OutreachLead,
  OutreachEmail,
  TenantEmailProviderConfig,
  CampaignStatus,
  CampaignStats,
  LeadStatus,
  EmailStatus,
  EmailProviderType,
  CreateCampaignInput,
  CreateSequenceInput,
  SaveLeadsInput,
  SendEmailInput,
} from "@magicwizards/outreach";

// ─── Row ↔ entity mappers ──────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapCampaignRow(row: any): OutreachCampaign {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    name: row.name,
    status: row.status,
    targetIndustry: row.target_industry ?? undefined,
    targetLocation: row.target_location ?? undefined,
    targetCriteria: row.target_criteria ?? undefined,
    fromEmail: row.from_email,
    fromName: row.from_name,
    dailySendLimit: row.daily_send_limit,
    totalSendLimit: row.total_send_limit,
    scheduledTaskId: row.scheduled_task_id ?? undefined,
    stats: row.stats as CampaignStats,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapSequenceRow(row: any): OutreachSequence {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    stepNumber: row.step_number,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    delayHours: row.delay_hours,
    condition: row.condition,
  };
}

function mapLeadRow(row: any): OutreachLead {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    tenantId: row.tenant_id,
    contactId: row.contact_id ?? undefined,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    email: row.email,
    phone: row.phone ?? undefined,
    businessName: row.business_name ?? undefined,
    source: row.source,
    sourceUrl: row.source_url ?? undefined,
    sourceMetadata: row.source_metadata ?? undefined,
    status: row.status,
    currentSequenceStep: row.current_sequence_step,
    lastContactedAt: row.last_contacted_at ? new Date(row.last_contacted_at) : undefined,
    lastOpenedAt: row.last_opened_at ? new Date(row.last_opened_at) : undefined,
    lastRepliedAt: row.last_replied_at ? new Date(row.last_replied_at) : undefined,
    nextActionAt: row.next_action_at ? new Date(row.next_action_at) : undefined,
    dealId: row.deal_id ?? undefined,
    personalizationContext: row.personalization_context ?? undefined,
  };
}

function mapEmailRow(row: any): OutreachEmail {
  return {
    id: row.id,
    leadId: row.lead_id,
    sequenceId: row.sequence_id,
    campaignId: row.campaign_id,
    tenantId: row.tenant_id,
    messageId: row.message_id ?? undefined,
    fromEmail: row.from_email,
    toEmail: row.to_email,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyText: row.body_text ?? undefined,
    status: row.status,
    openedAt: row.opened_at ? new Date(row.opened_at) : undefined,
    clickedAt: row.clicked_at ? new Date(row.clicked_at) : undefined,
    repliedAt: row.replied_at ? new Date(row.replied_at) : undefined,
    bouncedAt: row.bounced_at ? new Date(row.bounced_at) : undefined,
    sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
    errorMessage: row.error_message ?? undefined,
  };
}

function mapEmailProviderRow(row: any): TenantEmailProviderConfig {
  // In production, credentials_ciphertext would be decrypted here.
  // For now, parse as JSON (dev mode / no encryption key).
  let credentials: Record<string, string> = {};
  try {
    credentials = JSON.parse(row.credentials_ciphertext) as Record<string, string>;
  } catch {
    credentials = {};
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    providerType: row.provider_type,
    credentials,
    fromEmail: row.from_email,
    fromName: row.from_name,
    customDomain: row.custom_domain ?? undefined,
    isVerified: row.is_verified,
    isDefault: row.is_default,
    dailyLimit: row.daily_limit,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Campaign repository ────────────────────────────────────────────────────

export function createSupabaseCampaignRepo(): CampaignRepository {
  return {
    async create(input: CreateCampaignInput): Promise<OutreachCampaign> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_campaigns")
        .insert({
          tenant_id: input.tenantId,
          user_id: input.userId,
          name: input.name,
          target_industry: input.targetIndustry,
          target_location: input.targetLocation,
          target_criteria: input.targetCriteria ?? {},
          from_email: input.fromEmail,
          from_name: input.fromName,
          daily_send_limit: input.dailySendLimit ?? 50,
          total_send_limit: input.totalSendLimit ?? 1000,
        })
        .select()
        .single();
      if (error) throw error;
      return mapCampaignRow(data);
    },

    async getById(id: string, tenantId: string): Promise<OutreachCampaign | null> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_campaigns")
        .select()
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();
      if (error || !data) return null;
      return mapCampaignRow(data);
    },

    async list(tenantId: string, filters?: { status?: CampaignStatus }): Promise<OutreachCampaign[]> {
      const db = getSupabaseAdminClient();
      let query = db.from("outreach_campaigns").select().eq("tenant_id", tenantId);
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapCampaignRow);
    },

    async updateStatus(id: string, tenantId: string, status: CampaignStatus): Promise<OutreachCampaign> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_campaigns")
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) throw error;
      return mapCampaignRow(data);
    },

    async updateStats(id: string, tenantId: string, stats: Partial<CampaignStats>): Promise<void> {
      const db = getSupabaseAdminClient();
      // Merge with existing stats using RPC or read-modify-write
      const { data: existing } = await db
        .from("outreach_campaigns")
        .select("stats")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();
      const merged = { ...(existing?.stats as CampaignStats ?? {}), ...stats };
      const { error } = await db
        .from("outreach_campaigns")
        .update({ stats: merged })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async setScheduledTaskId(id: string, tenantId: string, taskId: string): Promise<void> {
      const db = getSupabaseAdminClient();
      const { error } = await db
        .from("outreach_campaigns")
        .update({ scheduled_task_id: taskId })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
  };
}

// ─── Sequence repository ────────────────────────────────────────────────────

export function createSupabaseSequenceRepo(): SequenceRepository {
  return {
    async create(input: CreateSequenceInput): Promise<OutreachSequence> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_sequences")
        .insert({
          campaign_id: input.campaignId,
          step_number: input.stepNumber,
          subject_template: input.subjectTemplate,
          body_template: input.bodyTemplate,
          delay_hours: input.delayHours,
          condition: input.condition,
        })
        .select()
        .single();
      if (error) throw error;
      return mapSequenceRow(data);
    },

    async listByCampaign(campaignId: string): Promise<OutreachSequence[]> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_sequences")
        .select()
        .eq("campaign_id", campaignId)
        .order("step_number", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapSequenceRow);
    },

    async getByStep(campaignId: string, stepNumber: number): Promise<OutreachSequence | null> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_sequences")
        .select()
        .eq("campaign_id", campaignId)
        .eq("step_number", stepNumber)
        .single();
      if (error || !data) return null;
      return mapSequenceRow(data);
    },
  };
}

// ─── Lead repository ────────────────────────────────────────────────────────

export function createSupabaseLeadRepo(): LeadRepository {
  return {
    async saveMany(input: SaveLeadsInput): Promise<OutreachLead[]> {
      const db = getSupabaseAdminClient();
      const rows = input.leads.map((l) => ({
        campaign_id: input.campaignId,
        tenant_id: input.tenantId,
        first_name: l.firstName,
        last_name: l.lastName,
        email: l.email,
        phone: l.phone,
        business_name: l.businessName,
        source: l.source,
        source_url: l.sourceUrl,
        source_metadata: l.sourceMetadata ?? {},
        personalization_context: l.personalizationContext ?? {},
      }));
      const { data, error } = await db
        .from("outreach_leads")
        .upsert(rows, { onConflict: "campaign_id,email", ignoreDuplicates: true })
        .select();
      if (error) throw error;
      return (data ?? []).map(mapLeadRow);
    },

    async getById(id: string, tenantId: string): Promise<OutreachLead | null> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_leads")
        .select()
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();
      if (error || !data) return null;
      return mapLeadRow(data);
    },

    async list(
      campaignId: string,
      tenantId: string,
      filters?: { status?: LeadStatus; limit?: number; offset?: number },
    ): Promise<OutreachLead[]> {
      const db = getSupabaseAdminClient();
      let query = db
        .from("outreach_leads")
        .select()
        .eq("campaign_id", campaignId)
        .eq("tenant_id", tenantId);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.limit) query = query.limit(filters.limit);
      if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapLeadRow);
    },

    async updateStatus(id: string, tenantId: string, status: LeadStatus): Promise<void> {
      const db = getSupabaseAdminClient();
      const { error } = await db
        .from("outreach_leads")
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async updateTracking(
      id: string,
      tenantId: string,
      fields: Partial<Pick<OutreachLead, "lastContactedAt" | "lastOpenedAt" | "lastRepliedAt" | "nextActionAt" | "currentSequenceStep">>,
    ): Promise<void> {
      const db = getSupabaseAdminClient();
      const update: Record<string, unknown> = {};
      if (fields.lastContactedAt !== undefined) update.last_contacted_at = fields.lastContactedAt.toISOString();
      if (fields.lastOpenedAt !== undefined) update.last_opened_at = fields.lastOpenedAt.toISOString();
      if (fields.lastRepliedAt !== undefined) update.last_replied_at = fields.lastRepliedAt.toISOString();
      if (fields.nextActionAt !== undefined) update.next_action_at = fields.nextActionAt.toISOString();
      if (fields.currentSequenceStep !== undefined) update.current_sequence_step = fields.currentSequenceStep;
      if (Object.keys(update).length === 0) return;
      const { error } = await db
        .from("outreach_leads")
        .update(update)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async getDueFollowups(campaignId: string, tenantId: string, before: Date): Promise<OutreachLead[]> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_leads")
        .select()
        .eq("campaign_id", campaignId)
        .eq("tenant_id", tenantId)
        .not("next_action_at", "is", null)
        .lte("next_action_at", before.toISOString())
        .in("status", ["discovered", "enriched", "contacted", "opened"])
        .order("next_action_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapLeadRow);
    },

    async setDealId(id: string, tenantId: string, dealId: string): Promise<void> {
      const db = getSupabaseAdminClient();
      const { error } = await db
        .from("outreach_leads")
        .update({ deal_id: dealId })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async setContactId(id: string, tenantId: string, contactId: string): Promise<void> {
      const db = getSupabaseAdminClient();
      const { error } = await db
        .from("outreach_leads")
        .update({ contact_id: contactId })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async getPipelineSummary(campaignId: string, tenantId: string): Promise<CampaignStats> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_leads")
        .select("status")
        .eq("campaign_id", campaignId)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      const stats: CampaignStats = {
        discovered: 0,
        contacted: 0,
        opened: 0,
        replied: 0,
        converted: 0,
        bounced: 0,
      };
      for (const row of data ?? []) {
        const s = row.status as string;
        if (s === "discovered" || s === "enriched") stats.discovered++;
        else if (s === "contacted") stats.contacted++;
        else if (s === "opened") stats.opened++;
        else if (s === "replied" || s === "interested" || s === "qualified") stats.replied++;
        else if (s === "converted") stats.converted++;
        else if (s === "bounced" || s === "invalid") stats.bounced++;
      }
      return stats;
    },
  };
}

// ─── Email log repository ───────────────────────────────────────────────────

export function createSupabaseEmailLogRepo(): EmailLogRepository {
  return {
    async create(input: SendEmailInput): Promise<OutreachEmail> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_emails")
        .insert({
          lead_id: input.leadId,
          campaign_id: input.campaignId,
          tenant_id: input.tenantId,
          sequence_id: input.sequenceId,
          from_email: input.fromEmail,
          to_email: input.toEmail,
          subject: input.subject,
          body_html: input.bodyHtml,
          body_text: input.bodyText,
        })
        .select()
        .single();
      if (error) throw error;
      return mapEmailRow(data);
    },

    async getByMessageId(messageId: string): Promise<OutreachEmail | null> {
      const db = getSupabaseAdminClient();
      // Cross-tenant lookup — used by webhooks
      const { data, error } = await db
        .from("outreach_emails")
        .select()
        .eq("message_id", messageId)
        .single();
      if (error || !data) return null;
      return mapEmailRow(data);
    },

    async updateStatus(
      id: string,
      status: EmailStatus,
      timestamps?: Partial<Pick<OutreachEmail, "openedAt" | "clickedAt" | "repliedAt" | "bouncedAt" | "sentAt">>,
    ): Promise<void> {
      const db = getSupabaseAdminClient();
      const update: Record<string, unknown> = { status };
      if (timestamps?.openedAt) update.opened_at = timestamps.openedAt.toISOString();
      if (timestamps?.clickedAt) update.clicked_at = timestamps.clickedAt.toISOString();
      if (timestamps?.repliedAt) update.replied_at = timestamps.repliedAt.toISOString();
      if (timestamps?.bouncedAt) update.bounced_at = timestamps.bouncedAt.toISOString();
      if (timestamps?.sentAt) update.sent_at = timestamps.sentAt.toISOString();
      const { error } = await db.from("outreach_emails").update(update).eq("id", id);
      if (error) throw error;
    },

    async listByLead(leadId: string): Promise<OutreachEmail[]> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("outreach_emails")
        .select()
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapEmailRow);
    },

    async countSentToday(campaignId: string, tenantId: string): Promise<number> {
      const db = getSupabaseAdminClient();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count, error } = await db
        .from("outreach_emails")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("tenant_id", tenantId)
        .in("status", ["sent", "delivered", "opened", "clicked", "replied"])
        .gte("created_at", todayStart.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  };
}

// ─── Email provider repository ──────────────────────────────────────────────

export function createSupabaseEmailProviderRepo(): EmailProviderRepository {
  return {
    async get(tenantId: string): Promise<TenantEmailProviderConfig | null> {
      const db = getSupabaseAdminClient();
      const { data, error } = await db
        .from("tenant_email_providers")
        .select()
        .eq("tenant_id", tenantId)
        .eq("is_default", true)
        .single();
      if (error || !data) return null;
      return mapEmailProviderRow(data);
    },

    async save(config: Omit<TenantEmailProviderConfig, "id">): Promise<TenantEmailProviderConfig> {
      const db = getSupabaseAdminClient();
      // In production, credentials would be encrypted here
      const ciphertext = JSON.stringify(config.credentials);
      const { data, error } = await db
        .from("tenant_email_providers")
        .upsert(
          {
            tenant_id: config.tenantId,
            provider_type: config.providerType,
            credentials_ciphertext: ciphertext,
            credentials_iv: "n/a",
            credentials_tag: "n/a",
            from_email: config.fromEmail,
            from_name: config.fromName,
            custom_domain: config.customDomain,
            is_verified: config.isVerified,
            is_default: config.isDefault,
            daily_limit: config.dailyLimit,
          },
          { onConflict: "tenant_id,provider_type" },
        )
        .select()
        .single();
      if (error) throw error;
      return mapEmailProviderRow(data);
    },

    async delete(tenantId: string, providerType: EmailProviderType): Promise<void> {
      const db = getSupabaseAdminClient();
      const { error } = await db
        .from("tenant_email_providers")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("provider_type", providerType);
      if (error) throw error;
    },
  };
}
