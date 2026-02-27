import { appConfig } from "../config.js";
import { logger } from "../logger.js";
import { escapeTelegramHtml, splitTelegramMessage } from "./format.js";

export async function sendTelegramText(
  chatId: number,
  text: string,
): Promise<void> {
  const endpoint = `https://api.telegram.org/bot${appConfig.telegram.botToken}/sendMessage`;
  const chunks = splitTelegramMessage(text);

  for (const chunk of chunks) {
    const payload = {
      chat_id: chatId,
      text: escapeTelegramHtml(chunk),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text();
      logger.error("telegram_send_failed", {
        status: response.status,
        responseText,
        chatId: String(chatId),
      });
    }
  }
}
