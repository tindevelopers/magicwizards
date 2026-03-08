/**
 * Email webhook router for tracking delivery events from email providers.
 * Handles Resend, SendGrid, and Amazon SES webhooks.
 */
import { Router } from "express";
import type { OutreachContext } from "../context.js";
import type { EmailStatus } from "../types.js";

export function createEmailWebhookRouter(
  getContext: (tenantId: string) => OutreachContext,
): Router {
  const router = Router();

  // ─── Resend webhooks ──────────────────────────────────────────────────────

  router.post("/resend", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const type = body.type as string;
      const data = body.data as Record<string, unknown>;
      const messageId = data?.email_id as string;

      if (!messageId) {
        res.status(400).json({ error: "Missing email_id" });
        return;
      }

      const statusMap: Record<string, EmailStatus> = {
        "email.sent": "sent",
        "email.delivered": "delivered",
        "email.opened": "opened",
        "email.clicked": "clicked",
        "email.bounced": "bounced",
        "email.complained": "complained",
      };

      const status = statusMap[type];
      if (!status) {
        res.json({ ok: true, ignored: true });
        return;
      }

      await processWebhookEvent(getContext, messageId, status);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Webhook processing failed",
      });
    }
  });

  // ─── SendGrid webhooks ────────────────────────────────────────────────────

  router.post("/sendgrid", async (req, res) => {
    try {
      const events = req.body as Array<Record<string, unknown>>;

      for (const event of events) {
        const messageId = event.sg_message_id as string;
        const eventType = event.event as string;

        if (!messageId) continue;

        const statusMap: Record<string, EmailStatus> = {
          delivered: "delivered",
          open: "opened",
          click: "clicked",
          bounce: "bounced",
          spamreport: "complained",
          dropped: "failed",
        };

        const status = statusMap[eventType];
        if (!status) continue;

        await processWebhookEvent(getContext, messageId, status);
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Webhook processing failed",
      });
    }
  });

  // ─── Amazon SES (SNS notification) ────────────────────────────────────────

  router.post("/ses", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;

      // Handle SNS subscription confirmation
      if (body.Type === "SubscriptionConfirmation") {
        const subscribeUrl = body.SubscribeURL as string;
        if (subscribeUrl) {
          await fetch(subscribeUrl);
        }
        res.json({ ok: true });
        return;
      }

      // Handle notification
      if (body.Type === "Notification") {
        const message = JSON.parse(body.Message as string) as Record<
          string,
          unknown
        >;
        const notificationType = message.notificationType as string;

        const mail = message.mail as Record<string, unknown>;
        const messageId = mail?.messageId as string;

        if (!messageId) {
          res.json({ ok: true, ignored: true });
          return;
        }

        const statusMap: Record<string, EmailStatus> = {
          Delivery: "delivered",
          Bounce: "bounced",
          Complaint: "complained",
        };

        const status = statusMap[notificationType];
        if (!status) {
          res.json({ ok: true, ignored: true });
          return;
        }

        await processWebhookEvent(getContext, messageId, status);
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Webhook processing failed",
      });
    }
  });

  return router;
}

// ─── Shared event processing ────────────────────────────────────────────────

const STATUS_TIMESTAMPS: Record<string, string> = {
  sent: "sentAt",
  opened: "openedAt",
  clicked: "clickedAt",
  replied: "repliedAt",
  bounced: "bouncedAt",
};

async function processWebhookEvent(
  getContext: (tenantId: string) => OutreachContext,
  messageId: string,
  status: EmailStatus,
): Promise<void> {
  // We need a context to look up the email — use a "system" tenant context
  // to find the email by messageId, then use the email's tenantId for updates.
  // The webhook router needs at least one context; we look up by messageId
  // which is globally unique across tenants.

  // For webhook processing, we pass a placeholder tenantId — the repository
  // implementation should support cross-tenant messageId lookups for webhooks.
  const ctx = getContext("__webhook__");
  const email = await ctx.repos.emailLog.getByMessageId(messageId);
  if (!email) return;

  // Build timestamp update
  const tsField = STATUS_TIMESTAMPS[status];
  const timestamps: Record<string, Date> = {};
  if (tsField) {
    timestamps[tsField] = new Date();
  }

  await ctx.repos.emailLog.updateStatus(
    email.id,
    status,
    timestamps as Record<string, Date>,
  );

  // Update lead status based on email status
  const leadStatusMap: Record<string, string> = {
    opened: "opened",
    replied: "replied",
    bounced: "bounced",
  };

  const leadStatus = leadStatusMap[status];
  if (leadStatus) {
    const leadCtx = getContext(email.tenantId);
    await leadCtx.repos.leads.updateStatus(
      email.leadId,
      email.tenantId,
      leadStatus as "opened" | "replied" | "bounced",
    );

    // Update tracking timestamps on lead
    if (status === "opened") {
      await leadCtx.repos.leads.updateTracking(
        email.leadId,
        email.tenantId,
        { lastOpenedAt: new Date() },
      );
    }
  }
}
