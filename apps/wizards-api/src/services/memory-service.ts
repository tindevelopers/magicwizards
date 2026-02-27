import { getSupabaseAdminClient } from "../supabase.js";

interface MemoryRow {
  content: string;
  importance_score: number;
  created_at: string;
}

export async function getMemoryContext(
  tenantId: string,
  userId?: string,
): Promise<string> {
  if (!userId) {
    return "";
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_memories")
    .select("content,importance_score,created_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .order("importance_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    return "";
  }

  const lines = (data as MemoryRow[]).map((entry) => `- ${entry.content}`);
  return `What I know about this user:\n${lines.join("\n")}`;
}

export async function saveMemory(input: {
  tenantId: string;
  userId?: string;
  externalUserRef?: string;
  content: string;
  importanceScore: number;
}): Promise<void> {
  if (!input.userId && !input.externalUserRef) {
    return;
  }

  const admin = getSupabaseAdminClient();
  await admin.from("user_memories").insert({
    tenant_id: input.tenantId,
    user_id: input.userId ?? null,
    external_user_ref: input.externalUserRef ?? null,
    content: input.content.slice(0, 4000),
    importance_score: input.importanceScore,
    created_at: new Date().toISOString(),
  });
}
