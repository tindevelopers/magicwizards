import type { OutreachContext } from "../context.js";
import type { OutreachEmail, OutreachLead } from "../types.js";

// ─── Template personalization ───────────────────────────────────────────────

/**
 * Replace `{{variable}}` placeholders with values from the lead's
 * personalization context and standard fields.
 */
function personalizeTemplate(
  template: string,
  lead: OutreachLead,
): string {
  const vars: Record<string, string> = {
    first_name: lead.firstName ?? "",
    last_name: lead.lastName ?? "",
    email: lead.email,
    phone: lead.phone ?? "",
    business_name: lead.businessName ?? "",
    ...(lead.personalizationContext as Record<string, string> | undefined),
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return vars[key] ?? "";
  });
}

// ─── Send a single outreach email ───────────────────────────────────────────

export async function sendOutreachEmail(
  ctx: OutreachContext,
  params: {
    leadId: string;
    campaignId: string;
    tenantId: string;
  },
): Promise<OutreachEmail> {
  // 1. Fetch lead
  const lead = await ctx.repos.leads.getById(params.leadId, params.tenantId);
  if (!lead) throw new Error(`Lead ${params.leadId} not found`);

  // 2. Fetch campaign for from-address
  const campaign = await ctx.repos.campaigns.getById(
    params.campaignId,
    params.tenantId,
  );
  if (!campaign) throw new Error(`Campaign ${params.campaignId} not found`);

  // 3. Determine which sequence step to send
  const step = lead.currentSequenceStep;
  const sequence = await ctx.repos.sequences.getByStep(
    params.campaignId,
    step,
  );
  if (!sequence) {
    throw new Error(
      `No sequence step ${step} found for campaign ${params.campaignId}`,
    );
  }

  // 4. Personalize subject and body
  const subject = personalizeTemplate(sequence.subjectTemplate, lead);
  const bodyHtml = personalizeTemplate(sequence.bodyTemplate, lead);

  // 5. Send via adapter
  const sendResult = await ctx.adapters.emailSender.send({
    to: lead.email,
    from: { email: campaign.fromEmail, name: campaign.fromName },
    subject,
    html: bodyHtml,
    trackOpens: true,
    trackClicks: true,
  });

  // 6. Record in email log
  const emailRecord = await ctx.repos.emailLog.create({
    leadId: lead.id,
    campaignId: params.campaignId,
    tenantId: params.tenantId,
    sequenceId: sequence.id,
    fromEmail: campaign.fromEmail,
    toEmail: lead.email,
    subject,
    bodyHtml,
  });

  // 7. Update email record with send result
  if (sendResult.success && sendResult.messageId) {
    await ctx.repos.emailLog.updateStatus(emailRecord.id, "sent", {
      sentAt: new Date(),
    });
  } else {
    await ctx.repos.emailLog.updateStatus(emailRecord.id, "failed");
  }

  // 8. Update lead tracking
  await ctx.repos.leads.updateStatus(lead.id, params.tenantId, "contacted");
  await ctx.repos.leads.updateTracking(lead.id, params.tenantId, {
    lastContactedAt: new Date(),
    currentSequenceStep: step + 1,
    // Schedule next follow-up if there's a next step
    nextActionAt: sequence.delayHours > 0
      ? new Date(Date.now() + sequence.delayHours * 60 * 60 * 1000)
      : undefined,
  });

  return emailRecord;
}

// ─── Batch send for a campaign ──────────────────────────────────────────────

export interface BatchSendResult {
  sent: number;
  failed: number;
  skipped: number;
  dailyLimitReached: boolean;
}

export async function sendCampaignBatch(
  ctx: OutreachContext,
  params: {
    campaignId: string;
    tenantId: string;
    batchSize?: number;
  },
): Promise<BatchSendResult> {
  const batchSize = params.batchSize ?? 20;
  const result: BatchSendResult = {
    sent: 0,
    failed: 0,
    skipped: 0,
    dailyLimitReached: false,
  };

  // 1. Get campaign and check daily limit
  const campaign = await ctx.repos.campaigns.getById(
    params.campaignId,
    params.tenantId,
  );
  if (!campaign) throw new Error(`Campaign ${params.campaignId} not found`);
  if (campaign.status !== "active") {
    throw new Error(`Campaign ${params.campaignId} is not active (status: ${campaign.status})`);
  }

  const sentToday = await ctx.repos.emailLog.countSentToday(
    params.campaignId,
    params.tenantId,
  );
  const remaining = campaign.dailySendLimit - sentToday;
  if (remaining <= 0) {
    result.dailyLimitReached = true;
    return result;
  }

  // 2. Get leads due for follow-up
  const dueLeads = await ctx.repos.leads.getDueFollowups(
    params.campaignId,
    params.tenantId,
    new Date(),
  );

  const toSend = dueLeads.slice(0, Math.min(batchSize, remaining));

  // 3. Send each
  for (const lead of toSend) {
    try {
      await sendOutreachEmail(ctx, {
        leadId: lead.id,
        campaignId: params.campaignId,
        tenantId: params.tenantId,
      });
      result.sent++;
    } catch {
      result.failed++;
    }
  }

  result.skipped = dueLeads.length - toSend.length;
  if (sentToday + result.sent >= campaign.dailySendLimit) {
    result.dailyLimitReached = true;
  }

  // 4. Update campaign stats
  await ctx.repos.campaigns.updateStats(
    params.campaignId,
    params.tenantId,
    { contacted: (campaign.stats.contacted ?? 0) + result.sent },
  );

  return result;
}

// ─── Preview email ──────────────────────────────────────────────────────────

export interface EmailPreview {
  subject: string;
  bodyHtml: string;
  toEmail: string;
  fromEmail: string;
  fromName: string;
}

export async function previewEmail(
  ctx: OutreachContext,
  params: { leadId: string; sequenceId: string; tenantId: string },
): Promise<EmailPreview> {
  const lead = await ctx.repos.leads.getById(params.leadId, params.tenantId);
  if (!lead) throw new Error(`Lead ${params.leadId} not found`);

  // Find the sequence step — we search all sequences for the campaign
  const sequences = await ctx.repos.sequences.listByCampaign(lead.campaignId);
  const sequence = sequences.find((s) => s.id === params.sequenceId);
  if (!sequence) throw new Error(`Sequence ${params.sequenceId} not found`);

  const campaign = await ctx.repos.campaigns.getById(
    lead.campaignId,
    params.tenantId,
  );
  if (!campaign) throw new Error(`Campaign ${lead.campaignId} not found`);

  return {
    subject: personalizeTemplate(sequence.subjectTemplate, lead),
    bodyHtml: personalizeTemplate(sequence.bodyTemplate, lead),
    toEmail: lead.email,
    fromEmail: campaign.fromEmail,
    fromName: campaign.fromName,
  };
}

// ─── Check email status ─────────────────────────────────────────────────────

export async function checkEmailStatus(
  ctx: OutreachContext,
  params: { emailId: string },
): Promise<OutreachEmail | null> {
  const emails = await ctx.repos.emailLog.listByLead(params.emailId);
  // emailId might be the actual email log ID — try to find it
  return emails.find((e) => e.id === params.emailId) ?? null;
}

// ─── Handle inbound reply ───────────────────────────────────────────────────

export async function handleReply(
  ctx: OutreachContext,
  params: { messageId: string },
): Promise<{ leadId: string; status: string } | null> {
  const email = await ctx.repos.emailLog.getByMessageId(params.messageId);
  if (!email) return null;

  // Update email status
  await ctx.repos.emailLog.updateStatus(email.id, "replied", {
    repliedAt: new Date(),
  });

  // Update lead status
  await ctx.repos.leads.updateStatus(email.leadId, email.tenantId, "replied");
  await ctx.repos.leads.updateTracking(email.leadId, email.tenantId, {
    lastRepliedAt: new Date(),
  });

  return { leadId: email.leadId, status: "replied" };
}
