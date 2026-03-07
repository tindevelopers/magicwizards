/**
 * Episodic Memory: past task outcomes with embeddings.
 *
 * After each wizard run, a summary of what was accomplished is stored.
 * When the user says "do that thing again" or "like last time", episodic
 * memory retrieves the relevant past task via cosine similarity.
 *
 * Salience decays faster than semantic memory (5%/day) since old task
 * outcomes become less relevant over time.
 */
import { getSupabaseAdminClient } from "../supabase.js";
import { logger } from "../logger.js";

export interface EpisodicMemory {
  id: string;
  summary: string;
  toolsUsed: string[];
  outcome: "success" | "partial" | "failed";
  salience: number;
  createdAt: string;
}

/**
 * Generate an embedding for text using OpenAI's embedding API.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY required for embeddings");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return payload.data[0].embedding;
}

/**
 * Summarize a wizard run's outcome using a cheap LLM pass.
 */
export async function summarizeRunOutcome(
  prompt: string,
  result: string,
  toolsUsed: string[],
): Promise<{ summary: string; outcome: EpisodicMemory["outcome"] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { summary: `Ran task: ${prompt.slice(0, 100)}`, outcome: "success" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: `Summarize this task outcome in one sentence. Return JSON: {"summary": "...", "outcome": "success"|"partial"|"failed"}`,
          },
          {
            role: "user",
            content: `Task: ${prompt.slice(0, 1000)}\nResult: ${result.slice(0, 1000)}\nTools: ${toolsUsed.join(", ")}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return { summary: `Ran task: ${prompt.slice(0, 100)}`, outcome: "success" };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const choices = payload.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = message?.content as string | undefined;
    if (!content) {
      return { summary: `Ran task: ${prompt.slice(0, 100)}`, outcome: "success" };
    }

    const parsed = JSON.parse(content) as { summary?: string; outcome?: string };
    return {
      summary: parsed.summary ?? `Ran task: ${prompt.slice(0, 100)}`,
      outcome: (parsed.outcome ?? "success") as EpisodicMemory["outcome"],
    };
  } catch {
    return { summary: `Ran task: ${prompt.slice(0, 100)}`, outcome: "success" };
  }
}

/**
 * Store an episodic memory after a wizard run.
 */
export async function storeEpisodicMemory(opts: {
  tenantId: string;
  userId?: string;
  summary: string;
  toolsUsed: string[];
  outcome: EpisodicMemory["outcome"];
  sessionId: string;
}): Promise<void> {
  if (!opts.userId) return;

  try {
    const embedding = await generateEmbedding(opts.summary);
    const admin = getSupabaseAdminClient();

    await admin.from("user_episodic_memories").insert({
      tenant_id: opts.tenantId,
      user_id: opts.userId,
      summary: opts.summary.slice(0, 4000),
      tools_used: opts.toolsUsed,
      outcome: opts.outcome,
      embedding,
      salience: 1.0,
      session_id: opts.sessionId,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("episodic_memory_store_failed", {
      tenantId: opts.tenantId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * Retrieve relevant episodic memories for a prompt.
 */
export async function retrieveEpisodicMemories(opts: {
  tenantId: string;
  userId?: string;
  query: string;
  limit?: number;
}): Promise<EpisodicMemory[]> {
  if (!opts.userId) return [];

  try {
    const embedding = await generateEmbedding(opts.query);
    const admin = getSupabaseAdminClient();

    const { data, error } = await admin.rpc("match_episodic_memories", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: opts.limit ?? 5,
      p_tenant_id: opts.tenantId,
      p_user_id: opts.userId,
    });

    if (error || !data) return [];

    return (
      data as Array<{
        id: string;
        summary: string;
        tools_used: string[];
        outcome: string;
        salience: number;
        created_at: string;
      }>
    ).map((row) => ({
      id: row.id,
      summary: row.summary,
      toolsUsed: row.tools_used ?? [],
      outcome: (row.outcome ?? "success") as EpisodicMemory["outcome"],
      salience: row.salience,
      createdAt: row.created_at,
    }));
  } catch (error) {
    logger.error("episodic_memory_retrieval_failed", {
      tenantId: opts.tenantId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

/**
 * Build an episodic memory context string for prompt injection.
 */
export async function getEpisodicMemoryContext(opts: {
  tenantId: string;
  userId?: string;
  query: string;
}): Promise<string> {
  const episodes = await retrieveEpisodicMemories({
    tenantId: opts.tenantId,
    userId: opts.userId,
    query: opts.query,
    limit: 5,
  });

  if (episodes.length === 0) return "";

  const lines = episodes.map(
    (e) =>
      `- [${e.outcome}] ${e.summary} (tools: ${e.toolsUsed.join(", ") || "none"})`,
  );
  return `Relevant past tasks:\n${lines.join("\n")}`;
}

/**
 * Process post-run episodic extraction: summarize and store.
 */
export async function processEpisodicExtraction(opts: {
  tenantId: string;
  userId?: string;
  prompt: string;
  result: string;
  toolsUsed: string[];
  sessionId: string;
}): Promise<void> {
  if (!opts.userId) return;

  const { summary, outcome } = await summarizeRunOutcome(
    opts.prompt,
    opts.result,
    opts.toolsUsed,
  );

  await storeEpisodicMemory({
    tenantId: opts.tenantId,
    userId: opts.userId,
    summary,
    toolsUsed: opts.toolsUsed,
    outcome,
    sessionId: opts.sessionId,
  });
}
