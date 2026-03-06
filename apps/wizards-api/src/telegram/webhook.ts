import { Router } from "express";
import { appConfig } from "../config.js";
import { logger } from "../logger.js";
import type { TelegramUpdate } from "../types.js";
import {
  getTenantConfig,
  resolveTenantIdentityFromTelegram,
} from "../services/tenant-resolution.js";
import { runWizardForTenant } from "../services/wizard-service.js";
import { sendTelegramText } from "./sender.js";
import { parseApprovalCallback } from "./approval-handler.js";
import { resolveApproval } from "../services/approval-store.js";

function verifyTelegramSecret(secretHeader: string | undefined): boolean {
  if (!appConfig.telegram.webhookSecret) {
    return true;
  }
  return secretHeader === appConfig.telegram.webhookSecret;
}

async function handleApprovalCallback(callbackQuery: TelegramUpdate["callback_query"]): Promise<boolean> {
  if (!callbackQuery?.data) return false;
  const parsed = parseApprovalCallback(callbackQuery.data);
  if (!parsed) return false;

  const resolved = resolveApproval(parsed.approvalId, parsed.decision);
  if (resolved) {
    const endpoint = `https://api.telegram.org/bot${appConfig.telegram.botToken}/answerCallbackQuery`;
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
        text: parsed.decision === "approved" ? "Approved" : "Denied",
      }),
    });
  }
  return resolved;
}

async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    const handled = await handleApprovalCallback(update.callback_query);
    if (handled) return;
  }

  const message = update.message;
  if (!message?.text) {
    return;
  }

  const telegramUserId = message.from?.id;
  const identity = await resolveTenantIdentityFromTelegram(
    message.chat.id,
    telegramUserId,
  );

  if (!identity) {
    await sendTelegramText(
      message.chat.id,
      "This chat is not linked to a tenant. Please contact your workspace admin.",
    );
    return;
  }

  const tenant = await getTenantConfig(identity.tenantId);
  if (!tenant || tenant.status !== "active") {
    await sendTelegramText(
      message.chat.id,
      "Your tenant is inactive or missing. Please contact support.",
    );
    return;
  }

  const startedAt = Date.now();
  try {
    const result = await runWizardForTenant({
      tenant,
      tenantId: identity.tenantId,
      userId: identity.userId,
      externalUserRef: telegramUserId ? String(telegramUserId) : undefined,
      prompt: message.text,
      channel: "telegram",
      channelMetadata: { telegramChatId: message.chat.id },
    });

    await sendTelegramText(message.chat.id, result.text);
    logger.info("telegram_wizard_run_completed", {
      tenantId: identity.tenantId,
      wizardId: result.wizardId,
      costUsd: result.costUsd,
      turns: result.turns,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error("telegram_wizard_run_failed", {
      tenantId: identity.tenantId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    await sendTelegramText(
      message.chat.id,
      "Magic Wizards hit an error while processing your request.",
    );
  }
}

export function createTelegramWebhookRouter(): Router {
  const router = Router();

  router.post("/telegram", (req, res) => {
    const secret = req.header("x-telegram-bot-api-secret-token");
    if (!verifyTelegramSecret(secret)) {
      res.status(401).json({ ok: false });
      return;
    }

    const update = req.body as TelegramUpdate;
    res.status(200).json({ ok: true });

    void handleTelegramUpdate(update);
  });

  return router;
}
