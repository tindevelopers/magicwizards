-- Integrations schema
-- Adds provider catalog, platform-level enablement, tenant connections, webhook events, and lightweight jobs.
-- This is designed for:
-- - System Admin (Platform Admin) controlling which providers are available
-- - Tenant Admin connecting their own credentials per tenant (stored encrypted, server-only)

-- Ensure crypto + uuid helpers are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Providers catalog (platform-defined)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  icon_slug TEXT,
  auth_type TEXT NOT NULL DEFAULT 'oauth2' CHECK (auth_type IN ('oauth2', 'api_key', 'webhook_only')),
  is_beta BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Platform-level enablement/settings (Platform Admin only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_integration_settings_provider_unique UNIQUE(provider_id)
);

-- ---------------------------------------------------------------------------
-- Tenant connections (tenant-scoped read, writes via server/service role)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connected', 'pending', 'error')),
  display_name TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}'::text[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT integration_connections_tenant_provider_unique UNIQUE(tenant_id, provider_id)
);

-- Encrypted secrets for connections (server-only access; no RLS policies added)
CREATE TABLE IF NOT EXISTS integration_connection_secrets (
  connection_id UUID PRIMARY KEY REFERENCES integration_connections(id) ON DELETE CASCADE,
  secrets_ciphertext TEXT NOT NULL,
  secrets_iv TEXT NOT NULL,
  secrets_tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Webhook receipts (server-only access; optionally expose counts later)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES integration_connections(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  event_type TEXT,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT integration_webhook_events_provider_idempotency_unique UNIQUE(provider_id, idempotency_key)
);

-- ---------------------------------------------------------------------------
-- Lightweight jobs (server-only; useful for retries/backoff)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES integration_connections(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'dead')),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Triggers for updated_at (reuse existing update_updated_at_column() function)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    -- Providers
    DROP TRIGGER IF EXISTS update_integration_providers_updated_at ON integration_providers;
    CREATE TRIGGER update_integration_providers_updated_at BEFORE UPDATE ON integration_providers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Platform settings
    DROP TRIGGER IF EXISTS update_platform_integration_settings_updated_at ON platform_integration_settings;
    CREATE TRIGGER update_platform_integration_settings_updated_at BEFORE UPDATE ON platform_integration_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Connections
    DROP TRIGGER IF EXISTS update_integration_connections_updated_at ON integration_connections;
    CREATE TRIGGER update_integration_connections_updated_at BEFORE UPDATE ON integration_connections
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Secrets
    DROP TRIGGER IF EXISTS update_integration_connection_secrets_updated_at ON integration_connection_secrets;
    CREATE TRIGGER update_integration_connection_secrets_updated_at BEFORE UPDATE ON integration_connection_secrets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Jobs
    DROP TRIGGER IF EXISTS update_integration_jobs_updated_at ON integration_jobs;
    CREATE TRIGGER update_integration_jobs_updated_at BEFORE UPDATE ON integration_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_integration_providers_category ON integration_providers(category);
CREATE INDEX IF NOT EXISTS idx_platform_integration_settings_enabled ON platform_integration_settings(enabled);
CREATE INDEX IF NOT EXISTS idx_integration_connections_tenant_id ON integration_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_provider_id ON integration_connections(provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_events_status ON integration_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_events_received_at ON integration_webhook_events(received_at);
CREATE INDEX IF NOT EXISTS idx_integration_jobs_status_run_at ON integration_jobs(status, run_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connection_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_jobs ENABLE ROW LEVEL SECURITY;

-- Helpers: identify Platform Admin (same pattern as existing platform-admin RLS)
-- Note: We intentionally inline this check in policies for portability.

-- Providers: allow read for authenticated users (catalog). Writes restricted to Platform Admin.
DROP POLICY IF EXISTS "Authenticated can read integration providers" ON integration_providers;
CREATE POLICY "Authenticated can read integration providers"
  ON integration_providers FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform admins can manage integration providers" ON integration_providers;
CREATE POLICY "Platform admins can manage integration providers"
  ON integration_providers FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
      AND u.tenant_id IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
      AND u.tenant_id IS NULL
    )
  );

-- Platform settings: Platform Admin only
DROP POLICY IF EXISTS "Platform admins can manage platform integration settings" ON platform_integration_settings;
CREATE POLICY "Platform admins can manage platform integration settings"
  ON platform_integration_settings FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
      AND u.tenant_id IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
      AND u.tenant_id IS NULL
    )
  );

-- Tenant connections: tenant users can read their tenant connections; Platform Admin can read all.
DROP POLICY IF EXISTS "Tenant users can read their integration connections" ON integration_connections;
CREATE POLICY "Tenant users can read their integration connections"
  ON integration_connections FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Platform Admin can read all
      EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND r.name = 'Platform Admin'
        AND u.tenant_id IS NULL
      )
      OR
      -- Tenant user reads only within their tenant
      tenant_id IN (
        SELECT tenant_id
        FROM public.users
        WHERE id = auth.uid()
        AND tenant_id IS NOT NULL
      )
    )
  );

-- Secrets/webhooks/jobs: no policies (service role only). Leave RLS enabled with no grants.

-- ---------------------------------------------------------------------------
-- Seed initial providers (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO integration_providers (slug, name, category, description, auth_type, is_beta)
VALUES
  ('gohighlevel', 'GoHighLevel', 'CRM', 'All-in-one CRM and marketing automation', 'oauth2', false),
  ('assemblyai', 'AssemblyAI', 'Voice', 'Speech-to-text and speech understanding', 'api_key', true),
  ('recall', 'Recall', 'Voice', 'Meeting capture and notetaker automation', 'api_key', true),
  ('outstand', 'Outstand', 'Social', 'Social posting and content scheduling', 'oauth2', true)
ON CONFLICT (slug) DO NOTHING;

