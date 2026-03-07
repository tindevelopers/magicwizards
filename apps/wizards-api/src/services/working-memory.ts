/**
 * Working Memory: per-session conversation history.
 *
 * Stores message turns in a session, supports retrieval for context injection,
 * and compacts old turns when the token limit is approached.
 */
import { getSupabaseAdminClient } from "../supabase.js";

export interface SessionMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolName?: string;
  timestamp: string;
}

/**
 * Append a message to a session's working memory.
 */
export async function appendSessionMessage(
  sessionId: string,
  message: Omit<SessionMessage, "timestamp">,
): Promise<void> {
  const admin = getSupabaseAdminClient();
  await admin.from("wizard_session_messages").insert({
    session_id: sessionId,
    role: message.role,
    content: message.content.slice(0, 16_000),
    tool_name: message.toolName ?? null,
    created_at: new Date().toISOString(),
  });
}

/**
 * Retrieve the conversation history for a session, ordered chronologically.
 */
export async function getSessionHistory(
  sessionId: string,
  limit = 50,
): Promise<SessionMessage[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("wizard_session_messages")
    .select("role, content, tool_name, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return (data as Array<Record<string, unknown>>).map((row) => ({
    role: row.role as SessionMessage["role"],
    content: row.content as string,
    toolName: (row.tool_name as string) || undefined,
    timestamp: row.created_at as string,
  }));
}

/**
 * Estimate the token count of the session history.
 * Rough heuristic: ~4 chars per token for English text.
 */
function estimateTokens(messages: SessionMessage[]): number {
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  return Math.ceil(totalChars / 4);
}

/**
 * Compact old session messages when token limit is approached.
 * Keeps the most recent messages and summarizes older ones into a single entry.
 */
export async function compactSessionIfNeeded(
  sessionId: string,
  maxTokens = 8000,
): Promise<void> {
  const messages = await getSessionHistory(sessionId, 200);
  const tokenCount = estimateTokens(messages);

  if (tokenCount <= maxTokens || messages.length <= 4) return;

  const keepCount = Math.max(4, Math.floor(messages.length / 3));
  const oldMessages = messages.slice(0, messages.length - keepCount);
  const recentMessages = messages.slice(messages.length - keepCount);

  const summary = oldMessages
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
    .join("\n");
  const compactedContent = `[Compacted ${oldMessages.length} earlier messages]\n${summary.slice(0, 2000)}`;

  const admin = getSupabaseAdminClient();

  const oldTimestamps = oldMessages.map((m) => m.timestamp);
  if (oldTimestamps.length > 0) {
    await admin
      .from("wizard_session_messages")
      .delete()
      .eq("session_id", sessionId)
      .in("created_at", oldTimestamps);
  }

  await admin.from("wizard_session_messages").insert({
    session_id: sessionId,
    role: "system",
    content: compactedContent,
    tool_name: null,
    created_at: new Date(
      new Date(recentMessages[0].timestamp).getTime() - 1,
    ).toISOString(),
  });
}

/**
 * Build a working memory context string from session history.
 */
export async function getWorkingMemoryContext(
  sessionId: string,
): Promise<string> {
  const messages = await getSessionHistory(sessionId, 30);
  if (messages.length === 0) return "";

  const lines = messages.map(
    (m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 500)}`,
  );
  return `Recent conversation:\n${lines.join("\n")}`;
}
