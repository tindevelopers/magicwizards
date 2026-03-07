# Install GoHighLevel Integration Provider

## Problem
The GoHighLevel integration shows "provider is not installed" because the `integration_providers` table and the GoHighLevel provider record don't exist in your remote Supabase database.

## Solution: Run the Migration

The migration file `supabase/migrations/20260116090000_create_integrations_schema.sql` contains the SQL to create the integration tables and seed the GoHighLevel provider.

### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/jruxnkslobykshunucwa/sql/new

2. **Copy the Migration SQL**
   - Open: `supabase/migrations/20260116090000_create_integrations_schema.sql`
   - Copy the entire contents

3. **Run the SQL**
   - Paste into the SQL Editor
   - Click "Run" or press `Cmd/Ctrl + Enter`
   - Wait for it to complete

4. **Verify**
   - Run: `pnpm supabase:install-gohighlevel`
   - Or check in the dashboard: Table Editor > `integration_providers`

### Option 2: Via Supabase CLI

If your migration history is synced:

```bash
# Link to your project (if not already linked)
supabase link --project-ref jruxnkslobykshunucwa

# Push migrations
supabase db push --include-all
```

If you get migration history errors, you may need to repair:

```bash
# See what Supabase CLI suggests for repair
supabase migration repair --help
```

### Option 3: Manual SQL Insert (Quick Fix)

If you just need the provider quickly and the table already exists:

1. Go to Supabase Dashboard SQL Editor
2. Run this SQL:

```sql
INSERT INTO integration_providers (slug, name, category, description, auth_type, is_beta)
VALUES
  ('gohighlevel', 'GoHighLevel', 'CRM', 'All-in-one CRM and marketing automation', 'oauth2', false)
ON CONFLICT (slug) DO NOTHING;
```

## After Installation

Once the provider is installed:

1. **Go to System Admin > Integrations**
   - Navigate to: `/saas/admin/system-admin/integrations`
   - You should see GoHighLevel in the list

2. **Enable and Configure**
   - Click on GoHighLevel
   - Enable the integration
   - Configure OAuth settings:
     - OAuth Client ID
     - OAuth Client Secret
     - OAuth Redirect URI (optional)
     - OAuth Scopes

3. **Connect from Tenant**
   - Go to: `/saas/integrations/crm/gohighlevel`
   - Click "Connect" to start OAuth flow

## Verify Installation

Run the verification script:

```bash
pnpm supabase:install-gohighlevel
```

This will check if the provider exists and show its details.
