import { getSupabaseAdminClient } from "../supabase.js";
import type { TenantConfig, TenantIdentity } from "../types.js";

interface TelegramIdentityRow {
  tenant_id: string;
  user_id?: string | null;
}

interface TenantRow {
  id: string;
  plan: string;
  status: string;
  wizard_provider?: string | null;
  wizard_model?: string | null;
  wizard_budget_usd?: number | null;
  default_wizard_id?: string | null;
}

export async function resolveTenantIdentityFromTelegram(
  chatId: number | string,
  telegramUserId?: number | string,
): Promise<TenantIdentity | null> {
  const admin = getSupabaseAdminClient();
  const chatIdStr = String(chatId);
  const telegramUserIdStr =
    telegramUserId !== undefined && telegramUserId !== null
      ? String(telegramUserId)
      : undefined;

  // Try user-specific match first (telegram_user_id set), then fall back to
  // chat-wide match (telegram_user_id is null = all users in chat).
  if (telegramUserIdStr) {
    const { data } = await admin
      .from("tenant_telegram_identities")
      .select("tenant_id,user_id")
      .eq("telegram_chat_id", chatIdStr)
      .eq("telegram_user_id", telegramUserIdStr)
      .eq("is_active", true)
      .maybeSingle<TelegramIdentityRow>();

    if (data) {
      return { tenantId: data.tenant_id, userId: data.user_id ?? undefined };
    }
  }

  // Fall back to chat-wide identity (no specific user restriction)
  const { data, error } = await admin
    .from("tenant_telegram_identities")
    .select("tenant_id,user_id")
    .eq("telegram_chat_id", chatIdStr)
    .is("telegram_user_id", null)
    .eq("is_active", true)
    .maybeSingle<TelegramIdentityRow>();

  if (error || !data) {
    return null;
  }

  return {
    tenantId: data.tenant_id,
    userId: data.user_id ?? undefined,
  };
}

export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .select(
      "id,plan,status,wizard_provider,wizard_model,wizard_budget_usd,default_wizard_id",
    )
    .eq("id", tenantId)
    .maybeSingle<TenantRow>();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    plan: data.plan,
    status: data.status,
    wizardProvider: data.wizard_provider,
    wizardModel: data.wizard_model,
    wizardBudgetUsd: data.wizard_budget_usd,
    defaultWizardId: data.default_wizard_id,
  };
}
