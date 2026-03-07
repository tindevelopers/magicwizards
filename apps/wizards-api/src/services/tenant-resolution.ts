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
}

export async function resolveTenantIdentityFromTelegram(
  chatId: number,
  telegramUserId?: number,
): Promise<TenantIdentity | null> {
  const admin = getSupabaseAdminClient();
  let query = admin
    .from("tenant_telegram_identities")
    .select("tenant_id,user_id")
    .eq("telegram_chat_id", String(chatId))
    .eq("is_active", true);

  if (telegramUserId) {
    query = query.eq("telegram_user_id", String(telegramUserId));
  }

  const { data, error } = await query.maybeSingle<TelegramIdentityRow>();
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
    .select("id,plan,status,wizard_provider,wizard_model,wizard_budget_usd")
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
  };
}
