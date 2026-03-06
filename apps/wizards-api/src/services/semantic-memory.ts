/**
 * Semantic Memory: long-term user facts and preferences stored as embeddings.
 *
 * After each wizard run, a cheap LLM pass extracts semantic facts from the
 * conversation and stores them with pgvector embeddings. Before each run,
 * relevant memories are retrieved via cosine similarity and injected as context.
 */
import { getSupabaseAdminClient } from "../supabase.js";
import { logger } from "../logger.js";

export interface SemanticMemory {
  id: string;
  content: string;
  category: "preference" | "fact" | "relationship" | "skill";
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
 * Extract semantic facts from a conversation using a cheap LLM pass.
 */
export async function extractSemanticFacts(
  conversation: string,
): Promise<Array<{ content: string; category: SemanticMemory["category"] }>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

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
            content: `Extract user facts from this conversation. Return JSON array of objects with "content" (the fact) and "category" (one of: preference, fact, relationship, skill). Only include clearly stated facts. Return [] if none found.`,
          },
          { role: "user", content: conversation.slice(0, 4000) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as Record<string, unknown>;
    const choices = payload.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = message?.content as string | undefined;
    if (!content) return [];

    const parsed = JSON.parse(content) as { facts?: Array<{ content: string; category: string }> };
    return (parsed.facts ?? []).map((f) => ({
      content: f.content,
      category: (f.category ?? "fact") as SemanticMemory["category"],
    }));
  } catch {
    return [];
  }
}

/**
 * Store a semantic memory with its embedding. Deduplicates by checking
 * similarity against existing memories.
 */
export async function storeSemanticMemory(opts: {
  tenantId: string;
  userId?: string;
  content: string;
  category: SemanticMemory["category"];
  sessionId?: string;
}): Promise<void> {
  if (!opts.userId) return;

  try {
    const embedding = await generateEmbedding(opts.content);
    const admin = getSupabaseAdminClient();

    const { data: existing } = await admin.rpc("match_semantic_memories", {
      query_embedding: embedding,
      match_threshold: 0.92,
      match_count: 1,
      p_tenant_id: opts.tenantId,
      p_user_id: opts.userId,
    });

    if (existing && (existing as unknown[]).length > 0) {
      const existingId = (existing as Array<{ id: string }>)[0].id;
      await admin
        .from("user_semantic_memories")
        .update({
          salience: 1.0,
          last_accessed_at: new Date().toISOString(),
        })
        .eq("id", existingId);
      return;
    }

    await admin.from("user_semantic_memories").insert({
      tenant_id: opts.tenantId,
      user_id: opts.userId,
      content: opts.content.slice(0, 4000),
      category: opts.category,
      embedding,
      salience: 1.0,
      source_session_id: opts.sessionId ?? null,
      created_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("semantic_memory_store_failed", {
      tenantId: opts.tenantId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * Retrieve relevant semantic memories for a prompt via cosine similarity.
 */
export async function retrieveSemanticMemories(opts: {
  tenantId: string;
  userId?: string;
  query: string;
  limit?: number;
}): Promise<SemanticMemory[]> {
  if (!opts.userId) return [];

  try {
    const embedding = await generateEmbedding(opts.query);
    const admin = getSupabaseAdminClient();

    const { data, error } = await admin.rpc("match_semantic_memories", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: opts.limit ?? 10,
      p_tenant_id: opts.tenantId,
      p_user_id: opts.userId,
    });

    if (error || !data) return [];

    const memories = data as Array<{
      id: string;
      content: string;
      category: string;
      salience: number;
      created_at: string;
    }>;

    const ids = memories.map((m) => m.id);
    if (ids.length > 0) {
      await admin
        .from("user_semantic_memories")
        .update({
          salience: 1.0,
          last_accessed_at: new Date().toISOString(),
        })
        .in("id", ids);
    }

    return memories.map((m) => ({
      id: m.id,
      content: m.content,
      category: m.category as SemanticMemory["category"],
      salience: m.salience,
      createdAt: m.created_at,
    }));
  } catch (error) {
    logger.error("semantic_memory_retrieval_failed", {
      tenantId: opts.tenantId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

/**
 * Build a semantic memory context string for prompt injection.
 */
export async function getSemanticMemoryContext(opts: {
  tenantId: string;
  userId?: string;
  query: string;
}): Promise<string> {
  const memories = await retrieveSemanticMemories({
    tenantId: opts.tenantId,
    userId: opts.userId,
    query: opts.query,
    limit: 10,
  });

  if (memories.length === 0) return "";

  const lines = memories.map(
    (m) => `- [${m.category}] ${m.content}`,
  );
  return `What I know about this user:\n${lines.join("\n")}`;
}

/**
 * Process post-run memory extraction: extract facts and store them.
 */
export async function processSemanticExtraction(opts: {
  tenantId: string;
  userId?: string;
  conversation: string;
  sessionId: string;
}): Promise<void> {
  if (!opts.userId) return;

  const facts = await extractSemanticFacts(opts.conversation);
  for (const fact of facts) {
    await storeSemanticMemory({
      tenantId: opts.tenantId,
      userId: opts.userId,
      content: fact.content,
      category: fact.category,
      sessionId: opts.sessionId,
    });
  }
}
