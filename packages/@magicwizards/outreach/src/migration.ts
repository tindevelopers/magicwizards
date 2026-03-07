/**
 * SQL migration strings for the outreach schema.
 *
 * Consumers can either:
 * 1. Copy this SQL into a migration file (e.g., Supabase, Flyway, Knex)
 * 2. Execute programmatically via a database client
 */

export const OUTREACH_MIGRATION_SQL = `
-- ============================================================================
-- Outreach Campaign Schema
-- ============================================================================

-- Campaign container
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  target_industry TEXT,
  target_location TEXT,
  target_criteria JSONB DEFAULT '{}',
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  daily_send_limit INTEGER NOT NULL DEFAULT 50,
  total_send_limit INTEGER NOT NULL DEFAULT 1000,
  scheduled_task_id UUID,
  stats JSONB NOT NULL DEFAULT '{"discovered":0,"contacted":0,"opened":0,"replied":0,"converted":0,"bounced":0}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_tenant
  ON outreach_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_status
  ON outreach_campaigns(tenant_id, status);

-- Multi-step email sequence definitions
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'no_reply'
    CHECK (condition IN ('no_reply', 'no_open', 'always')),
  UNIQUE (campaign_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_outreach_sequences_campaign
  ON outreach_sequences(campaign_id);

-- Discovered contacts per campaign
CREATE TABLE IF NOT EXISTS outreach_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  source TEXT NOT NULL
    CHECK (source IN ('instagram', 'google_maps', 'web_search', 'enrichment', 'manual', 'import')),
  source_url TEXT,
  source_metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (status IN (
      'discovered', 'enriched', 'contacted', 'opened', 'replied',
      'interested', 'qualified', 'converted', 'unsubscribed', 'bounced', 'invalid'
    )),
  current_sequence_step INTEGER NOT NULL DEFAULT 1,
  last_contacted_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  last_replied_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  deal_id UUID,
  personalization_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS idx_outreach_leads_campaign
  ON outreach_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_tenant
  ON outreach_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_status
  ON outreach_leads(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_next_action
  ON outreach_leads(campaign_id, next_action_at)
  WHERE next_action_at IS NOT NULL;

-- Individual email send log
CREATE TABLE IF NOT EXISTS outreach_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id TEXT,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued', 'sending', 'sent', 'delivered', 'opened',
      'clicked', 'replied', 'bounced', 'complained', 'failed'
    )),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_emails_lead
  ON outreach_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_campaign
  ON outreach_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_message_id
  ON outreach_emails(message_id)
  WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outreach_emails_tenant_date
  ON outreach_emails(tenant_id, campaign_id, created_at);

-- Per-tenant email provider credentials (AES-256-GCM encrypted)
CREATE TABLE IF NOT EXISTS tenant_email_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL
    CHECK (provider_type IN ('resend', 'sendgrid', 'amazon_ses', 'brevo', 'postmark', 'mailgun')),
  credentials_ciphertext TEXT NOT NULL,
  credentials_iv TEXT NOT NULL,
  credentials_tag TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  custom_domain TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  daily_limit INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_type)
);

CREATE INDEX IF NOT EXISTS idx_tenant_email_providers_tenant
  ON tenant_email_providers(tenant_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_outreach_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_outreach_campaigns_updated_at
  BEFORE UPDATE ON outreach_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_outreach_updated_at();

CREATE TRIGGER trg_tenant_email_providers_updated_at
  BEFORE UPDATE ON tenant_email_providers
  FOR EACH ROW EXECUTE FUNCTION update_outreach_updated_at();
`;

export const OUTREACH_RLS_POLICIES_SQL = `
-- ============================================================================
-- Row Level Security Policies (Supabase-specific)
-- ============================================================================

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_email_providers ENABLE ROW LEVEL SECURITY;

-- Campaigns: tenant-scoped access
CREATE POLICY outreach_campaigns_tenant_select ON outreach_campaigns
  FOR SELECT USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);
CREATE POLICY outreach_campaigns_tenant_insert ON outreach_campaigns
  FOR INSERT WITH CHECK (tenant_id = (current_setting('app.tenant_id', true))::uuid);
CREATE POLICY outreach_campaigns_tenant_update ON outreach_campaigns
  FOR UPDATE USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- Sequences: access via campaign ownership
CREATE POLICY outreach_sequences_tenant_select ON outreach_sequences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM outreach_campaigns c
      WHERE c.id = campaign_id
      AND c.tenant_id = (current_setting('app.tenant_id', true))::uuid)
  );
CREATE POLICY outreach_sequences_tenant_insert ON outreach_sequences
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM outreach_campaigns c
      WHERE c.id = campaign_id
      AND c.tenant_id = (current_setting('app.tenant_id', true))::uuid)
  );

-- Leads: tenant-scoped
CREATE POLICY outreach_leads_tenant_select ON outreach_leads
  FOR SELECT USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);
CREATE POLICY outreach_leads_tenant_insert ON outreach_leads
  FOR INSERT WITH CHECK (tenant_id = (current_setting('app.tenant_id', true))::uuid);
CREATE POLICY outreach_leads_tenant_update ON outreach_leads
  FOR UPDATE USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- Emails: tenant-scoped
CREATE POLICY outreach_emails_tenant_select ON outreach_emails
  FOR SELECT USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);
CREATE POLICY outreach_emails_tenant_insert ON outreach_emails
  FOR INSERT WITH CHECK (tenant_id = (current_setting('app.tenant_id', true))::uuid);
CREATE POLICY outreach_emails_tenant_update ON outreach_emails
  FOR UPDATE USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- Email providers: tenant-scoped
CREATE POLICY tenant_email_providers_tenant_select ON tenant_email_providers
  FOR SELECT USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);
CREATE POLICY tenant_email_providers_tenant_insert ON tenant_email_providers
  FOR INSERT WITH CHECK (tenant_id = (current_setting('app.tenant_id', true))::uuid);
CREATE POLICY tenant_email_providers_tenant_update ON tenant_email_providers
  FOR UPDATE USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);
`;
