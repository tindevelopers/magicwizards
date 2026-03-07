# Integrations (SDK-first)

This repo supports **modular integrations** where:

- **System Admin (Platform Owner)** controls which integrations are available platform-wide and configures provider-level defaults (e.g., OAuth client credentials).
- **Tenant Admin** connects/enables a subset of integrations for their own tenant by completing OAuth / entering tenant credentials.

## Provider catalog

Providers are defined in `integration_providers` (seeded by migration):
- `gohighlevel`
- `assemblyai`
- `recall`
- `outstand`

## Required environment variables

These are **server-only** env vars used by integrations infrastructure:

- `INTEGRATIONS_ENCRYPTION_KEY`: base64-encoded 32-byte key used to encrypt tenant connection secrets at rest.
  - Example to generate locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- `INTEGRATIONS_STATE_SECRET`: secret used to sign OAuth `state` (HMAC SHA-256). Use a long random string.

Supabase env vars are also required (already used by the platform):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## System Admin setup (platform owner)

1. Go to **System Admin → Integrations**:
   - `/saas/admin/system-admin/integrations`
2. Enable **GoHighLevel**
3. Click **Configure** for GoHighLevel and set:
   - OAuth Client ID
   - OAuth Client Secret
   - OAuth Scopes (space- or comma-separated)
   - OAuth Redirect URI (optional)

These settings are stored in `platform_integration_settings.settings`.

## Tenant setup (tenant admin)

1. Go to **Integrations → CRM → GoHighLevel**:
   - `/saas/integrations/crm/gohighlevel`
2. Click **Connect**
3. Complete OAuth authorization
4. Back on the page, you should see:
   - Status `connected`
   - Sync button (smoke-test: calls GoHighLevel contacts list)

## Implementation notes

- Database schema is in:
  - `supabase/migrations/20260116090000_create_integrations_schema.sql`
- Shared SDK utilities:
  - `packages/@tinadmin/integrations-core`
- GoHighLevel SDK:
  - `packages/@tinadmin/integration-gohighlevel`
- Admin UI + API routes:
  - `apps/admin/app/saas/integrations/*`
  - `apps/admin/app/saas/admin/system-admin/integrations/*`
  - `apps/admin/app/api/integrations/gohighlevel/*`

