-- Magic Wizards governance and dynamic defaults
-- - Platform runtime defaults without redeploy
-- - Editable core prompts per wizard
-- - Tenant append-only wizard instructions
-- - Tenant-level default wizard selection

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_wizard_id TEXT;

CREATE TABLE IF NOT EXISTS public.magic_wizards_platform_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  default_provider TEXT,
  default_model TEXT,
  default_wizard_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.magic_wizards_platform_config (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER update_magic_wizards_platform_config_updated_at
  BEFORE UPDATE ON public.magic_wizards_platform_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.wizard_templates (
  wizard_id TEXT PRIMARY KEY,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_wizard_templates_updated_at
  BEFORE UPDATE ON public.wizard_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.tenant_wizard_prompts (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wizard_id TEXT NOT NULL,
  additional_instructions TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, wizard_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_wizard_prompts_tenant_id
  ON public.tenant_wizard_prompts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_wizard_prompts_wizard_id
  ON public.tenant_wizard_prompts (wizard_id);

CREATE TRIGGER update_tenant_wizard_prompts_updated_at
  BEFORE UPDATE ON public.tenant_wizard_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.magic_wizards_platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wizard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_wizard_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magic_wizards_platform_config_platform_admin" ON public.magic_wizards_platform_config;
CREATE POLICY "magic_wizards_platform_config_platform_admin"
  ON public.magic_wizards_platform_config FOR ALL
  USING (is_platform_admin_user())
  WITH CHECK (is_platform_admin_user());

DROP POLICY IF EXISTS "wizard_templates_platform_admin" ON public.wizard_templates;
CREATE POLICY "wizard_templates_platform_admin"
  ON public.wizard_templates FOR ALL
  USING (is_platform_admin_user())
  WITH CHECK (is_platform_admin_user());

DROP POLICY IF EXISTS "tenant_wizard_prompts_select" ON public.tenant_wizard_prompts;
CREATE POLICY "tenant_wizard_prompts_select"
  ON public.tenant_wizard_prompts FOR SELECT
  USING (
    is_platform_admin_user()
    OR tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND u.tenant_id IS NOT NULL
        AND r.name IN ('Organization Admin', 'Workspace Admin')
    )
  );

DROP POLICY IF EXISTS "tenant_wizard_prompts_manage" ON public.tenant_wizard_prompts;
CREATE POLICY "tenant_wizard_prompts_manage"
  ON public.tenant_wizard_prompts FOR ALL
  USING (
    is_platform_admin_user()
    OR tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND u.tenant_id IS NOT NULL
        AND r.name IN ('Organization Admin', 'Workspace Admin')
    )
  )
  WITH CHECK (
    is_platform_admin_user()
    OR tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND u.tenant_id IS NOT NULL
        AND r.name IN ('Organization Admin', 'Workspace Admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.magic_wizards_platform_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wizard_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_wizard_prompts TO service_role;
