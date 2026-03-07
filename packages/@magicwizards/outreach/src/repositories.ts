import type {
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
} from "./types.js";

// ─── Campaign repository ────────────────────────────────────────────────────

export interface CampaignRepository {
  create(input: CreateCampaignInput): Promise<OutreachCampaign>;
  getById(id: string, tenantId: string): Promise<OutreachCampaign | null>;
  list(
    tenantId: string,
    filters?: { status?: CampaignStatus },
  ): Promise<OutreachCampaign[]>;
  updateStatus(
    id: string,
    tenantId: string,
    status: CampaignStatus,
  ): Promise<OutreachCampaign>;
  updateStats(
    id: string,
    tenantId: string,
    stats: Partial<CampaignStats>,
  ): Promise<void>;
  setScheduledTaskId(
    id: string,
    tenantId: string,
    taskId: string,
  ): Promise<void>;
}

// ─── Sequence repository ────────────────────────────────────────────────────

export interface SequenceRepository {
  create(input: CreateSequenceInput): Promise<OutreachSequence>;
  listByCampaign(campaignId: string): Promise<OutreachSequence[]>;
  getByStep(
    campaignId: string,
    stepNumber: number,
  ): Promise<OutreachSequence | null>;
}

// ─── Lead repository ────────────────────────────────────────────────────────

export interface LeadRepository {
  saveMany(input: SaveLeadsInput): Promise<OutreachLead[]>;
  getById(id: string, tenantId: string): Promise<OutreachLead | null>;
  list(
    campaignId: string,
    tenantId: string,
    filters?: { status?: LeadStatus; limit?: number; offset?: number },
  ): Promise<OutreachLead[]>;
  updateStatus(
    id: string,
    tenantId: string,
    status: LeadStatus,
  ): Promise<void>;
  updateTracking(
    id: string,
    tenantId: string,
    fields: Partial<
      Pick<
        OutreachLead,
        | "lastContactedAt"
        | "lastOpenedAt"
        | "lastRepliedAt"
        | "nextActionAt"
        | "currentSequenceStep"
      >
    >,
  ): Promise<void>;
  getDueFollowups(
    campaignId: string,
    tenantId: string,
    before: Date,
  ): Promise<OutreachLead[]>;
  setDealId(id: string, tenantId: string, dealId: string): Promise<void>;
  setContactId(
    id: string,
    tenantId: string,
    contactId: string,
  ): Promise<void>;
  getPipelineSummary(
    campaignId: string,
    tenantId: string,
  ): Promise<CampaignStats>;
}

// ─── Email log repository ───────────────────────────────────────────────────

export interface EmailLogRepository {
  create(input: SendEmailInput): Promise<OutreachEmail>;
  getByMessageId(messageId: string): Promise<OutreachEmail | null>;
  updateStatus(
    id: string,
    status: EmailStatus,
    timestamps?: Partial<
      Pick<
        OutreachEmail,
        "openedAt" | "clickedAt" | "repliedAt" | "bouncedAt" | "sentAt"
      >
    >,
  ): Promise<void>;
  listByLead(leadId: string): Promise<OutreachEmail[]>;
  countSentToday(campaignId: string, tenantId: string): Promise<number>;
}

// ─── Email provider repository ──────────────────────────────────────────────

export interface EmailProviderRepository {
  get(tenantId: string): Promise<TenantEmailProviderConfig | null>;
  save(
    config: Omit<TenantEmailProviderConfig, "id">,
  ): Promise<TenantEmailProviderConfig>;
  delete(tenantId: string, providerType: EmailProviderType): Promise<void>;
}
