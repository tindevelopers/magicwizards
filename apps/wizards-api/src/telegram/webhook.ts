import { Router } from "express";
import { appConfig } from "../config.js";
import { logger } from "../logger.js";
import type { TelegramUpdate } from "../types.js";
import {
  getTenantConfig,
  resolveTenantIdentityFromTelegram,
} from "../services/tenant-resolution.js";
import { runWizardForTenant } from "../services/wizard-service.js";
import { sendTelegramChatAction, sendTelegramText } from "./sender.js";
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

  const chatId = message.chat.id;
  const telegramUserId = message.from?.id;
  logger.info("telegram_webhook_message", {
    update_id: update.update_id,
    chatIdType: typeof chatId,
    hasFrom: !!message.from,
    telegramUserIdType: message.from ? typeof message.from.id : "n/a",
  });

  const identity = await resolveTenantIdentityFromTelegram(
    chatId,
    telegramUserId,
  );

  if (!identity) {
    logger.warn("telegram_tenant_not_linked", {
      update_id: update.update_id,
      chatIdType: typeof chatId,
      telegramUserIdType: message.from ? typeof message.from.id : "n/a",
    });
    await sendTelegramText(
      chatId,
      "This chat is not linked to a tenant. Please contact your workspace admin.",
    );
    return;
  }

  const tenant = await getTenantConfig(identity.tenantId);
  if (!tenant || tenant.status !== "active") {
    logger.warn("telegram_tenant_inactive_or_missing", {
      update_id: update.update_id,
      tenantId: identity.tenantId,
      tenantNull: !tenant,
      status: tenant?.status ?? "n/a",
    });
    await sendTelegramText(
      chatId,
      "Your tenant is inactive or missing. Please contact support.",
    );
    return;
  }

  const startedAt = Date.now();
  // Show typing immediately; keep it alive every 4s until we reply (wizard can take 60s+)
  void sendTelegramChatAction(chatId, "typing");
  const typingInterval = setInterval(() => {
    void sendTelegramChatAction(chatId, "typing");
  }, 4000);

  try {
    const result = await runWizardForTenant({
      tenant,
      tenantId: identity.tenantId,
      userId: identity.userId,
      externalUserRef: telegramUserId ? String(telegramUserId) : undefined,
      prompt: message.text,
      channel: "telegram",
      channelMetadata: { telegramChatId: chatId },
    });

    clearInterval(typingInterval);
    await sendTelegramText(chatId, result.text);
    logger.info("telegram_wizard_run_completed", {
      tenantId: identity.tenantId,
      wizardId: result.wizardId,
      costUsd: result.costUsd,
      turns: result.turns,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    clearInterval(typingInterval);
    logger.error("telegram_wizard_run_failed", {
      tenantId: identity.tenantId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    await sendTelegramText(
      chatId,
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
