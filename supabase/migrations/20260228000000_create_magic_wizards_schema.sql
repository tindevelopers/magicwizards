-- Magic Wizards schema
-- Multi-tenant wizard execution, usage metering, memory, MCP registry, and Telegram identity mapping.

-- ============================================================================
-- Helper: platform admin check
-- ============================================================================
CREATE OR REPLACE FUNCTION is_platform_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenant-level wizard runtime overrides
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS wizard_provider TEXT,
  ADD COLUMN IF NOT EXISTS wizard_model TEXT,
  ADD COLUMN IF NOT EXISTS wizard_budget_usd NUMERIC(12, 6);

-- ============================================================================
-- Wizard Sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS wizard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  wizard_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'mobile', 'api')),
  external_session_id TEXT,
  input_excerpt TEXT,
  output_excerpt TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  turn_count INTEGER NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wizard_sessions_tenant_id ON wizard_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_user_id ON wizard_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_status ON wizard_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_started_at ON wizard_sessions(started_at DESC);

CREATE TRIGGER update_wizard_sessions_updated_at
  BEFORE UPDATE ON wizard_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Usage Events
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  turns INTEGER NOT NULL DEFAULT 0,
  provider TEXT,
  model TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_id ON usage_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_recorded_at ON usage_events(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_recorded_at ON usage_events(tenant_id, recorded_at DESC);

-- ============================================================================
-- User Memories
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  external_user_ref TEXT,
  content TEXT NOT NULL,
  importance_score INTEGER NOT NULL DEFAULT 1 CHECK (importance_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_memories_tenant_id ON user_memories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_tenant_user ON user_memories(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_tenant_external_user ON user_memories(tenant_id, external_user_ref);
CREATE INDEX IF NOT EXISTS idx_user_memories_importance_created ON user_memories(tenant_id, importance_score DESC, created_at DESC);

-- ============================================================================
-- Tenant MCP Servers
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  server_name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, server_name)
);

CREATE INDEX IF NOT EXISTS idx_tenant_mcp_servers_tenant_id ON tenant_mcp_servers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_mcp_servers_enabled ON tenant_mcp_servers(tenant_id, enabled);

CREATE TRIGGER update_tenant_mcp_servers_updated_at
  BEFORE UPDATE ON tenant_mcp_servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Tenant Telegram Identities
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_telegram_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  telegram_chat_id TEXT NOT NULL,
  telegram_user_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_telegram_identities_tenant_id ON tenant_telegram_identities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_telegram_identities_chat_id ON tenant_telegram_identities(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_tenant_telegram_identities_user_id ON tenant_telegram_identities(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_telegram_identities_active ON tenant_telegram_identities(tenant_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_telegram_identity
  ON tenant_telegram_identities (tenant_id, telegram_chat_id, COALESCE(telegram_user_id, ''));

CREATE TRIGGER update_tenant_telegram_identities_updated_at
  BEFORE UPDATE ON tenant_telegram_identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS enablement
-- ============================================================================
ALTER TABLE wizard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_telegram_identities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS policies (tenant scoped + platform admin override)
-- ============================================================================

-- Wizard sessions
DROP POLICY IF EXISTS "wizard_sessions_tenant_select" ON wizard_sessions;
CREATE POLICY "wizard_sessions_tenant_select"
  ON wizard_sessions FOR SELECT
  USING (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "wizard_sessions_tenant_insert" ON wizard_sessions;
CREATE POLICY "wizard_sessions_tenant_insert"
  ON wizard_sessions FOR INSERT
  WITH CHECK (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "wizard_sessions_tenant_update" ON wizard_sessions;
CREATE POLICY "wizard_sessions_tenant_update"
  ON wizard_sessions FOR UPDATE
  USING (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

-- Usage events
DROP POLICY IF EXISTS "usage_events_tenant_select" ON usage_events;
CREATE POLICY "usage_events_tenant_select"
  ON usage_events FOR SELECT
  USING (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "usage_events_tenant_insert" ON usage_events;
CREATE POLICY "usage_events_tenant_insert"
  ON usage_events FOR INSERT
  WITH CHECK (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

-- Memories
DROP POLICY IF EXISTS "user_memories_tenant_select" ON user_memories;
CREATE POLICY "user_memories_tenant_select"
  ON user_memories FOR SELECT
  USING (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "user_memories_tenant_insert" ON user_memories;
CREATE POLICY "user_memories_tenant_insert"
  ON user_memories FOR INSERT
  WITH CHECK (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "user_memories_tenant_update" ON user_memories;
CREATE POLICY "user_memories_tenant_update"
  ON user_memories FOR UPDATE
  USING (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "user_memories_tenant_delete" ON user_memories;
CREATE POLICY "user_memories_tenant_delete"
  ON user_memories FOR DELETE
  USING (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

-- Tenant MCP servers
DROP POLICY IF EXISTS "tenant_mcp_servers_tenant_select" ON tenant_mcp_servers;
CREATE POLICY "tenant_mcp_servers_tenant_select"
  ON tenant_mcp_servers FOR SELECT
  USING (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_mcp_servers_tenant_manage" ON tenant_mcp_servers;
CREATE POLICY "tenant_mcp_servers_tenant_manage"
  ON tenant_mcp_servers FOR ALL
  USING (
    is_platform_admin_user()
    OR tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    is_platform_admin_user()
    OR tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE id = auth.uid()
    )
  );

-- Tenant Telegram identities
DROP POLICY IF EXISTS "tenant_telegram_identities_tenant_select" ON tenant_telegram_identities;
CREATE POLICY "tenant_telegram_identities_tenant_select"
  ON tenant_telegram_identities FOR SELECT
  USING (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_telegram_identities_tenant_manage" ON tenant_telegram_identities;
CREATE POLICY "tenant_telegram_identities_tenant_manage"
  ON tenant_telegram_identities FOR ALL
  USING (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    is_platform_admin_user()
    OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );
