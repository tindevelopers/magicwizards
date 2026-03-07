// ─── Domain entities ─────────────────────────────────────────────────────────

export interface OutreachCampaign {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  status: CampaignStatus;
  targetIndustry?: string;
  targetLocation?: string;
  targetCriteria?: Record<string, unknown>;
  fromEmail: string;
  fromName: string;
  dailySendLimit: number;
  totalSendLimit: number;
  scheduledTaskId?: string;
  stats: CampaignStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutreachSequence {
  id: string;
  campaignId: string;
  stepNumber: number;
  subjectTemplate: string;
  bodyTemplate: string;
  delayHours: number;
  condition: SequenceCondition;
}

export interface OutreachLead {
  id: string;
  campaignId: string;
  tenantId: string;
  contactId?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  businessName?: string;
  source: LeadSource;
  sourceUrl?: string;
  sourceMetadata?: Record<string, unknown>;
  status: LeadStatus;
  currentSequenceStep: number;
  lastContactedAt?: Date;
  lastOpenedAt?: Date;
  lastRepliedAt?: Date;
  nextActionAt?: Date;
  dealId?: string;
  personalizationContext?: Record<string, unknown>;
}

export interface OutreachEmail {
  id: string;
  leadId: string;
  sequenceId: string;
  campaignId: string;
  tenantId: string;
  messageId?: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  status: EmailStatus;
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  bouncedAt?: Date;
  sentAt?: Date;
  errorMessage?: string;
}

export interface TenantEmailProviderConfig {
  id: string;
  tenantId: string;
  providerType: EmailProviderType;
  /** Decrypted credential map — encryption is the consumer's responsibility */
  credentials: Record<string, string>;
  fromEmail: string;
  fromName: string;
  customDomain?: string;
  isVerified: boolean;
  isDefault: boolean;
  dailyLimit: number;
}

// ─── Enums / literal unions ──────────────────────────────────────────────────

export type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type SequenceCondition = "no_reply" | "no_open" | "always";

export type LeadSource =
  | "instagram"
  | "google_maps"
  | "web_search"
  | "enrichment"
  | "manual"
  | "import";

export type LeadStatus =
  | "discovered"
  | "enriched"
  | "contacted"
  | "opened"
  | "replied"
  | "interested"
  | "qualified"
  | "converted"
  | "unsubscribed"
  | "bounced"
  | "invalid";

export type EmailStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "replied"
  | "bounced"
  | "complained"
  | "failed";

export type EmailProviderType =
  | "resend"
  | "sendgrid"
  | "amazon_ses"
  | "brevo"
  | "postmark"
  | "mailgun";

export interface CampaignStats {
  discovered: number;
  contacted: number;
  opened: number;
  replied: number;
  converted: number;
  bounced: number;
}

// ─── Create / update DTOs ────────────────────────────────────────────────────

export interface CreateCampaignInput {
  tenantId: string;
  userId: string;
  name: string;
  targetIndustry?: string;
  targetLocation?: string;
  targetCriteria?: Record<string, unknown>;
  fromEmail: string;
  fromName: string;
  dailySendLimit?: number;
  totalSendLimit?: number;
}

export interface CreateSequenceInput {
  campaignId: string;
  stepNumber: number;
  subjectTemplate: string;
  bodyTemplate: string;
  delayHours: number;
  condition: SequenceCondition;
}

export interface SaveLeadsInput {
  campaignId: string;
  tenantId: string;
  leads: Array<{
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    businessName?: string;
    source: LeadSource;
    sourceUrl?: string;
    sourceMetadata?: Record<string, unknown>;
    personalizationContext?: Record<string, unknown>;
  }>;
}

export interface SendEmailInput {
  leadId: string;
  campaignId: string;
  tenantId: string;
  sequenceId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}
