import { getSupabaseAdminClient } from "../supabase.js";

export async function createWizardSession(input: {
  tenantId: string;
  userId?: string;
  wizardId: string;
  channel: "telegram" | "mobile" | "api";
  externalSessionId?: string;
}): Promise<string> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("wizard_sessions")
    .insert({
      tenant_id: input.tenantId,
      user_id: input.userId ?? null,
      wizard_id: input.wizardId,
      channel: input.channel,
      external_session_id: input.externalSessionId ?? null,
      started_at: new Date().toISOString(),
      status: "running",
    })
    .select("id")
    .single<{ id: string }>();

  if (!data?.id) {
    throw new Error("Failed to create wizard session");
  }
  return data.id;
}

export async function completeWizardSession(input: {
  sessionId: string;
  totalCostUsd: number;
  turnCount: number;
  status: "completed" | "failed";
  outputText?: string;
  errorMessage?: string;
}): Promise<void> {
  const admin = getSupabaseAdminClient();
  await admin
    .from("wizard_sessions")
    .update({
      ended_at: new Date().toISOString(),
      total_cost_usd: input.totalCostUsd,
      turn_count: input.turnCount,
      status: input.status,
      output_excerpt: input.outputText?.slice(0, 1000) ?? null,
      error_message: input.errorMessage ?? null,
    })
    .eq("id", input.sessionId);
}
