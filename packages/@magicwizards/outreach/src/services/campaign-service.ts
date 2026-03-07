import type { OutreachContext } from "../context.js";
import type {
  OutreachCampaign,
  OutreachSequence,
  OutreachLead,
  CampaignStatus,
  CampaignStats,
  CreateCampaignInput,
  CreateSequenceInput,
} from "../types.js";

// ─── Campaign CRUD ──────────────────────────────────────────────────────────

export async function createCampaign(
  ctx: OutreachContext,
  input: CreateCampaignInput,
): Promise<OutreachCampaign> {
  return ctx.repos.campaigns.create(input);
}

export async function getCampaign(
  ctx: OutreachContext,
  params: { id: string; tenantId: string },
): Promise<OutreachCampaign | null> {
  return ctx.repos.campaigns.getById(params.id, params.tenantId);
}

export async function listCampaigns(
  ctx: OutreachContext,
  params: { tenantId: string; status?: CampaignStatus },
): Promise<OutreachCampaign[]> {
  return ctx.repos.campaigns.list(params.tenantId, {
    status: params.status,
  });
}

// ─── Status transitions ────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["active", "cancelled"],
  active: ["paused", "completed", "cancelled"],
  paused: ["active", "cancelled"],
  completed: [],
  cancelled: [],
};

export async function updateCampaignStatus(
  ctx: OutreachContext,
  params: { id: string; tenantId: string; status: CampaignStatus },
): Promise<OutreachCampaign> {
  const campaign = await ctx.repos.campaigns.getById(
    params.id,
    params.tenantId,
  );
  if (!campaign) throw new Error(`Campaign ${params.id} not found`);

  const allowed = VALID_TRANSITIONS[campaign.status];
  if (!allowed.includes(params.status)) {
    throw new Error(
      `Cannot transition campaign from "${campaign.status}" to "${params.status}". ` +
        `Allowed: ${allowed.join(", ") || "none"}`,
    );
  }

  return ctx.repos.campaigns.updateStatus(
    params.id,
    params.tenantId,
    params.status,
  );
}

// ─── Pipeline summary ───────────────────────────────────────────────────────

export async function getPipelineSummary(
  ctx: OutreachContext,
  params: { campaignId: string; tenantId: string },
): Promise<CampaignStats> {
  return ctx.repos.leads.getPipelineSummary(
    params.campaignId,
    params.tenantId,
  );
}

// ─── Sequence management ────────────────────────────────────────────────────

export async function createSequence(
  ctx: OutreachContext,
  input: CreateSequenceInput,
): Promise<OutreachSequence> {
  // Validate no duplicate step numbers
  const existing = await ctx.repos.sequences.getByStep(
    input.campaignId,
    input.stepNumber,
  );
  if (existing) {
    throw new Error(
      `Step ${input.stepNumber} already exists for campaign ${input.campaignId}`,
    );
  }

  return ctx.repos.sequences.create(input);
}

export async function listSequences(
  ctx: OutreachContext,
  params: { campaignId: string },
): Promise<OutreachSequence[]> {
  return ctx.repos.sequences.listByCampaign(params.campaignId);
}

// ─── CRM promotion ─────────────────────────────────────────────────────────

export async function promoteToCrm(
  ctx: OutreachContext,
  params: { leadId: string; tenantId: string; dealTitle?: string; dealValue?: number },
): Promise<{ contactId: string; dealId: string }> {
  if (!ctx.adapters.crm) {
    throw new Error("CRM adapter is not configured");
  }

  const lead = await ctx.repos.leads.getById(params.leadId, params.tenantId);
  if (!lead) throw new Error(`Lead ${params.leadId} not found`);

  // Create CRM contact
  const { contactId } = await ctx.adapters.crm.createContact({
    tenantId: params.tenantId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    company: lead.businessName,
    source: `outreach:${lead.source}`,
  });

  // Create CRM deal
  const { dealId } = await ctx.adapters.crm.createDeal({
    tenantId: params.tenantId,
    contactId,
    title: params.dealTitle ?? `Outreach: ${lead.businessName ?? lead.email}`,
    value: params.dealValue,
    source: "outreach",
  });

  // Update lead with CRM references
  await ctx.repos.leads.setContactId(lead.id, params.tenantId, contactId);
  await ctx.repos.leads.setDealId(lead.id, params.tenantId, dealId);
  await ctx.repos.leads.updateStatus(lead.id, params.tenantId, "converted");

  return { contactId, dealId };
}

// ─── Campaign scheduling ────────────────────────────────────────────────────

export async function scheduleCampaign(
  ctx: OutreachContext,
  params: {
    campaignId: string;
    tenantId: string;
    cron: string;
  },
): Promise<{ taskId: string }> {
  if (!ctx.adapters.scheduler) {
    throw new Error("Task scheduler is not configured");
  }

  const campaign = await ctx.repos.campaigns.getById(
    params.campaignId,
    params.tenantId,
  );
  if (!campaign) throw new Error(`Campaign ${params.campaignId} not found`);

  const { taskId } = await ctx.adapters.scheduler.createTask({
    id: `outreach-campaign-${params.campaignId}`,
    cron: params.cron,
    prompt: `Run outreach campaign ${params.campaignId}: send next batch and process follow-ups`,
    description: `Outreach: ${campaign.name}`,
  });

  await ctx.repos.campaigns.setScheduledTaskId(
    params.campaignId,
    params.tenantId,
    taskId,
  );

  return { taskId };
}

// ─── Due follow-ups ─────────────────────────────────────────────────────────

export async function getDueFollowups(
  ctx: OutreachContext,
  params: { campaignId: string; tenantId: string },
): Promise<OutreachLead[]> {
  return ctx.repos.leads.getDueFollowups(
    params.campaignId,
    params.tenantId,
    new Date(),
  );
}
