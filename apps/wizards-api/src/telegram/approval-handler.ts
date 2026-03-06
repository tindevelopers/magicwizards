/**
 * Telegram approval handler: sends inline buttons [Approve] [Deny]
 * and waits for the user's callback.
 */
import type { ApprovalHandler, ApprovalRequest, ApprovalResult } from "@magicwizards/wizards-core";
import { appConfig } from "../config.js";
import { logger } from "../logger.js";
import { registerPendingApproval } from "../services/approval-store.js";

const APPROVAL_PREFIX = "approve:";
const DENY_PREFIX = "deny:";

export function getApprovalCallbackData(approvalId: string): {
  approve: string;
  deny: string;
} {
  return {
    approve: `${APPROVAL_PREFIX}${approvalId}`,
    deny: `${DENY_PREFIX}${approvalId}`,
  };
}

export function parseApprovalCallback(
  data: string,
): { approvalId: string; decision: "approved" | "denied" } | null {
  if (data.startsWith(APPROVAL_PREFIX)) {
    return { approvalId: data.slice(APPROVAL_PREFIX.length), decision: "approved" };
  }
  if (data.startsWith(DENY_PREFIX)) {
    return { approvalId: data.slice(DENY_PREFIX.length), decision: "denied" };
  }
  return null;
}

async function sendTelegramMessageWithButtons(
  chatId: number,
  text: string,
  approveData: string,
  denyData: string,
): Promise<void> {
  const endpoint = `https://api.telegram.org/bot${appConfig.telegram.botToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Approve", callback_data: approveData }],
        [{ text: "❌ Deny", callback_data: denyData }],
      ],
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Telegram send failed: ${response.status}`);
  }
}

export const telegramApprovalHandler: ApprovalHandler = {
  async requestApproval(request: ApprovalRequest): Promise<ApprovalResult> {
    const chatId = request.channelMetadata?.telegramChatId as number | undefined;
    if (!chatId) {
      logger.warn("telegram_approval_no_chat_id", { approvalId: request.id });
      return {
        decision: "denied",
        approvalId: request.id,
        decidedAt: new Date(),
      };
    }

    const { approve, deny } = getApprovalCallbackData(request.id);
    const summary = JSON.stringify(request.toolInput).slice(0, 200);
    const text = `🔐 <b>Approval required</b>\n\n` +
      `<b>${request.mcpServer}</b> / <code>${request.toolName}</code>\n` +
      `Input: ${summary}${summary.length >= 200 ? "…" : ""}\n\n` +
      `Approve or deny this action:`;

    await sendTelegramMessageWithButtons(chatId, text, approve, deny);

    return new Promise<ApprovalResult>((resolve, reject) => {
      registerPendingApproval(
        request.id,
        resolve,
        reject,
        request.expiresAt.getTime(),
      );
    });
  },
};