import { getTenantCostProfile } from "@magicwizards/wizards-core";
import { getSupabaseAdminClient } from "../supabase.js";

export class TenantBudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantBudgetExceededError";
  }
}

interface UsageAggregateRow {
  total_cost: number | null;
  total_turns: number | null;
  sessions: number | null;
}

export async function getMonthlyUsage(tenantId: string): Promise<{
  totalCostUsd: number;
  totalTurns: number;
  sessions: number;
}> {
  const admin = getSupabaseAdminClient();
  const now = new Date();
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const { data, error } = await admin
    .from("usage_events")
    .select("cost_usd,turns,session_id")
    .eq("tenant_id", tenantId)
    .gte("recorded_at", firstDay.toISOString());

  if (error || !data) {
    return { totalCostUsd: 0, totalTurns: 0, sessions: 0 };
  }

  const aggregate: UsageAggregateRow = data.reduce(
    (acc: UsageAggregateRow, row: Record<string, unknown>) => {
      const cost = Number(row.cost_usd ?? 0);
      const turns = Number(row.turns ?? 0);
      const sessionId = String(row.session_id ?? "");
      return {
        total_cost: (acc.total_cost ?? 0) + cost,
        total_turns: (acc.total_turns ?? 0) + turns,
        sessions: (acc.sessions ?? 0) + (sessionId ? 1 : 0),
      };
    },
    { total_cost: 0, total_turns: 0, sessions: 0 },
  );

  return {
    totalCostUsd: Number(aggregate.total_cost ?? 0),
    totalTurns: Number(aggregate.total_turns ?? 0),
    sessions: Number(aggregate.sessions ?? 0),
  };
}

export async function checkBudgetLimit(tenantId: string, tenantPlan: string): Promise<void> {
  const usage = await getMonthlyUsage(tenantId);
  const profile = getTenantCostProfile(tenantPlan);
  if (usage.totalCostUsd > profile.monthlyBudgetUsd) {
    throw new TenantBudgetExceededError(
      `Tenant ${tenantId} exceeded monthly budget ${profile.monthlyBudgetUsd} USD`,
    );
  }
}

export async function recordUsage(input: {
  tenantId: string;
  sessionId: string;
  costUsd: number;
  turns: number;
  provider: string;
  model: string;
}): Promise<void> {
  const admin = getSupabaseAdminClient();
  await admin.from("usage_events").insert({
    tenant_id: input.tenantId,
    session_id: input.sessionId,
    cost_usd: input.costUsd,
    turns: input.turns,
    provider: input.provider,
    model: input.model,
    recorded_at: new Date().toISOString(),
  });
}
