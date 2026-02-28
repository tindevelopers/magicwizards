# Using Supabase project kwctqnrmczdlaxehceii

All apps are configured to use **https://kwctqnrmczdlaxehceii.supabase.co**:

- **Portal** – `apps/portal/.env.local`
- **Admin** – `apps/admin/.env.local`
- **Wizards API** – `apps/wizards-api/.env`

## Linking the CLI to this database

The **service role key** cannot be used to link the CLI. `supabase link` talks to the Supabase **Management API** (project list, settings). It only works when the account you used in `supabase login` has access to the project in the dashboard. The service role key is for your app (Auth, PostgREST); it is not used by the link command.

You have two ways to use the CLI with **kwctqnrmczdlaxehceii**:

### A. Link (requires dashboard access)

If your Supabase account can see this project (same org or invited):

```bash
supabase link --project-ref kwctqnrmczdlaxehceii
```

When prompted, enter the **database password** (Dashboard → Project **kwctqnrmczdlaxehceii** → Settings → Database → Database password). Then run `supabase db push` as usual.

### B. Push migrations without linking (no Management API)

You can push migrations using the **database password** only (not the service role key). In Dashboard → Project **kwctqnrmczdlaxehceii** → Settings → Database, copy the **Connection string** (URI) or use the database password in:

```bash
# Replace [YOUR_DATABASE_PASSWORD] with the project's database password (Settings → Database)
export DB_URL="postgresql://postgres.kwctqnrmczdlaxehceii:[YOUR_DATABASE_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
supabase db push --db-url "$DB_URL"
```

If your project is in another region, use the host from the Connection string in the Dashboard (e.g. `aws-0-eu-west-1.pooler.supabase.com`). The **database password** is the one you set when creating the project (or reset under Settings → Database); it is not the anon or service_role key.

---

## Applying migrations (schema) to this project

If the CLI cannot reach this project (no link and no database password), apply migrations via the Dashboard instead.

### Option 1: Run the combined SQL file (recommended)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **kwctqnrmczdlaxehceii** → **SQL Editor**.
2. Open the file **`supabase/apply-migrations-kwctqnrmczdlaxehceii.sql`** in this repo (it contains all migrations in order).
3. Paste the full contents into a new query and click **Run**.
4. If the editor has a size limit or a statement fails, use Option 2.

### Option 2: Run each migration file in order

In the same SQL Editor, run each file under `supabase/migrations/` **in this order** (oldest first):

1. `20251204211105_create_users_tenants_roles.sql`
2. `20251204220000_tenant_isolation_rls.sql`
3. `20251204220001_fix_rls_auth.sql`
4. … through …
32. `20260228000000_create_magic_wizards_schema.sql`

Copy the contents of each file, paste into the editor, run, then move to the next.

### After migrations are applied

From the repo root:

```bash
pnpm run create:tin-users
```

This creates **systemadmin@tin.info** (Platform Admin) and **gene@tin.info** (tenant user) with password `88888888`.

---

## Production (Vercel) – Admin app and Magic Wizards

The **Magic Wizards** System Admin page (`/saas/admin/system-admin/magic-wizards`) and other system-admin features need the admin app to have these environment variables set in **Vercel** (Project → Settings → Environment variables) for the **admin** app:

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | e.g. `https://kwctqnrmczdlaxehceii.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon/public key for the same project |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Required for Magic Wizards (tenant list, Telegram/MCP, platform-admin checks). Never expose to the client. |

If `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_URL` is missing in production, the Magic Wizards page can show a generic “An error occurred in the Server Components render” message. Fix by adding the variables above and redeploying the admin app.
