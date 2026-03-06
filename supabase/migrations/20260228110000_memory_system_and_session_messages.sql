-- ---------------------------------------------------------------------------
-- Working Memory: session message history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wizard_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_messages_session_id
  ON wizard_session_messages(session_id, created_at);

ALTER TABLE wizard_session_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_messages_via_session" ON wizard_session_messages;
CREATE POLICY "session_messages_via_session"
  ON wizard_session_messages FOR SELECT
  USING (
    is_platform_admin_user()
    OR session_id IN (
      SELECT id FROM wizard_sessions
      WHERE tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- pgvector similarity search functions for semantic and episodic memories
-- ---------------------------------------------------------------------------

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Semantic memory similarity search
CREATE OR REPLACE FUNCTION match_semantic_memories(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count INT,
  p_tenant_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  category TEXT,
  salience FLOAT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.content,
    m.category,
    m.salience,
    m.created_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM user_semantic_memories m
  WHERE m.tenant_id = p_tenant_id
    AND m.user_id = p_user_id
    AND m.salience > 0.05
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Episodic memory similarity search
CREATE OR REPLACE FUNCTION match_episodic_memories(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count INT,
  p_tenant_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  summary TEXT,
  tools_used TEXT[],
  outcome TEXT,
  salience FLOAT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.summary,
    m.tools_used,
    m.outcome,
    m.salience,
    m.created_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM user_episodic_memories m
  WHERE m.tenant_id = p_tenant_id
    AND m.user_id = p_user_id
    AND m.salience > 0.05
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ---------------------------------------------------------------------------
-- Memory salience decay: run daily via Cloud Scheduler or pg_cron
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION decay_memory_salience()
RETURNS void
LANGUAGE sql
AS $$
  -- Semantic: 2% decay per day
  UPDATE user_semantic_memories
  SET salience = GREATEST(salience * 0.98, 0.01)
  WHERE salience > 0.05;

  -- Episodic: 5% decay per day
  UPDATE user_episodic_memories
  SET salience = GREATEST(salience * 0.95, 0.01)
  WHERE salience > 0.05;
$$;
