-- ---------------------------------------------------------------------------
-- Extend integration_connections to support both tenant-level and user-level
-- connections, and register telephony providers.
-- ---------------------------------------------------------------------------

-- 1. Add user_id and scope columns to integration_connections
ALTER TABLE integration_connections
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant'
    CHECK (scope IN ('tenant', 'user'));

-- 2. Replace unique constraint to allow per-user connections
-- Use CREATE UNIQUE INDEX (expressions like COALESCE not allowed in ADD CONSTRAINT UNIQUE)
ALTER TABLE integration_connections
  DROP CONSTRAINT IF EXISTS integration_connections_tenant_provider_unique;
CREATE UNIQUE INDEX IF NOT EXISTS integration_connections_tenant_provider_user_unique
  ON integration_connections (tenant_id, provider_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3. Index for fast user-level lookups
CREATE INDEX IF NOT EXISTS idx_integration_connections_user_id
  ON integration_connections(user_id) WHERE user_id IS NOT NULL;

-- 4. Index for scope-based queries
CREATE INDEX IF NOT EXISTS idx_integration_connections_scope
  ON integration_connections(tenant_id, scope);

-- ---------------------------------------------------------------------------
-- Register telephony providers
-- ---------------------------------------------------------------------------
INSERT INTO integration_providers (slug, name, category, auth_type, description)
VALUES
  ('telnyx', 'Telnyx', 'telephony', 'api_key',
   'AI voice agents, full telephony, and SMS via Telnyx'),
  ('vapi', 'Vapi', 'telephony', 'api_key',
   'AI voice agents with easiest setup via Vapi'),
  ('twilio', 'Twilio', 'telephony', 'api_key',
   'Full Twilio API for voice, SMS, and telephony')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Update RLS policy for integration_connections to support user-level reads
-- Users can read their own user-level connections + all tenant-level connections.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant users can read their integration connections" ON integration_connections;
CREATE POLICY "Tenant users can read their integration connections"
  ON integration_connections FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Platform admin sees all
      is_platform_admin_user()
      -- Tenant-level connections: visible to all users in the tenant
      OR (
        scope = 'tenant'
        AND tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
      )
      -- User-level connections: visible only to the owning user
      OR (
        scope = 'user'
        AND user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Add scheduled_tasks table (enterprise/custom plans only, enforced in app layer)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  mcp_servers TEXT[] DEFAULT '{}',
  next_run TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  last_run_at TIMESTAMPTZ,
  last_result TEXT,
  delivery_channel TEXT DEFAULT 'telegram' CHECK (delivery_channel IN ('telegram', 'portal', 'api')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_tenant_id ON scheduled_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(status, next_run)
  WHERE status = 'active';

ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduled_tasks_tenant_select" ON scheduled_tasks;
CREATE POLICY "scheduled_tasks_tenant_select"
  ON scheduled_tasks FOR SELECT
  USING (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "scheduled_tasks_tenant_manage" ON scheduled_tasks;
CREATE POLICY "scheduled_tasks_tenant_manage"
  ON scheduled_tasks FOR ALL
  USING (
    is_platform_admin_user()
    OR tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
        AND r.name IN ('Platform Admin', 'Workspace Admin', 'Organization Admin')
    )
  );

-- ---------------------------------------------------------------------------
-- Memory tables for three-tier memory system
-- ---------------------------------------------------------------------------

-- Semantic memory: user facts/preferences stored as embeddings
CREATE TABLE IF NOT EXISTS user_semantic_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('preference', 'fact', 'relationship', 'skill')),
  embedding vector(1536) NOT NULL,
  salience FLOAT DEFAULT 1.0,
  source_session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_semantic_memories_tenant_user
  ON user_semantic_memories(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_semantic_memories_embedding
  ON user_semantic_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE user_semantic_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_semantic_memories_select" ON user_semantic_memories;
CREATE POLICY "user_semantic_memories_select"
  ON user_semantic_memories FOR SELECT
  USING (
    is_platform_admin_user()
    OR (user_id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

-- Episodic memory: past task outcomes with embeddings
CREATE TABLE IF NOT EXISTS user_episodic_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  tools_used TEXT[] DEFAULT '{}',
  outcome TEXT CHECK (outcome IN ('success', 'partial', 'failed')),
  embedding vector(1536) NOT NULL,
  salience FLOAT DEFAULT 1.0,
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_episodic_memories_tenant_user
  ON user_episodic_memories(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_episodic_memories_embedding
  ON user_episodic_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE user_episodic_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_episodic_memories_select" ON user_episodic_memories;
CREATE POLICY "user_episodic_memories_select"
  ON user_episodic_memories FOR SELECT
  USING (
    is_platform_admin_user()
    OR (user_id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );
