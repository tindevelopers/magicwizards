# Migration Status Guide

## How Supabase Migrations Work

Supabase migrations are **automatically applied** when you start Supabase locally using:

```bash
supabase start
```

## Migration Files Location

All migrations are located in: `supabase/migrations/`

Current migrations (in order):
1. `20251204211105_create_users_tenants_roles.sql` - Initial schema
2. `20251204220000_tenant_isolation_rls.sql` - RLS policies
3. `20251204220001_fix_rls_auth.sql` - RLS fixes
4. `20251204220002_fix_rls_unauthenticated.sql` - RLS fixes
5. `20251204220003_fix_tenant_insert.sql` - Tenant insert fixes
6. `20251204220004_fix_function_error.sql` - Function fixes
7. `20251204220005_recreate_rls_policies.sql` - RLS policy recreation
8. `20251204220006_fix_function_schema_references.sql` - Schema fixes
9. `20251204220007_disable_rls_for_admin.sql` - Admin RLS
10. `20251204220008_ensure_function_accessible.sql` - Function accessibility
11. `20251204220009_fix_rls_for_client_queries.sql` - Client query fixes
12. `20251204220010_fix_tenant_rls_policy.sql` - Tenant RLS fixes
13. `20251204220011_set_platform_admins_tenant_null.sql` - Platform admin setup
14. `20251204220012_update_rls_for_platform_admins.sql` - Platform admin RLS
15. `20251204220013_add_tenant_constraints.sql` - Tenant constraints
16. `20251204220014_create_audit_logs.sql` - Audit logs
17. `20251205000000_workspaces_schema.sql` - Workspaces schema
18. `20251205000001_add_workspace_to_audit_logs.sql` - Workspace audit logs
19. `20251205000002_user_tenant_roles.sql` - User tenant roles junction table
20. `20251205120000_update_role_names.sql` - Role name updates

## Checking Migration Status

### Check if migrations have been applied:

```bash
# Check Supabase status
supabase status

# This will show:
# - API URL
# - DB URL
# - Studio URL
# - And whether migrations have been applied
```

### Check migration history in database:

```bash
# Connect to Supabase Studio
# Visit: http://localhost:54323

# Or query the migration table directly:
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;"
```

## When Migrations Are Applied

### Automatic Application:
- ✅ **`supabase start`** - Automatically applies all pending migrations
- ✅ **`supabase db reset`** - Resets database and applies all migrations

### Manual Application (if needed):
```bash
# Apply pending migrations
supabase migration up

# Or reset and reapply all migrations
supabase db reset
```

## Verifying Migrations Were Applied

### Method 1: Check Supabase Status
```bash
supabase status
```

### Method 2: Check Database Tables
```bash
# Connect to database
psql postgresql://postgres:postgres@localhost:54322/postgres

# Check if tables exist
\dt

# Should see tables like:
# - users
# - tenants
# - roles
# - user_tenant_roles
# - audit_logs
# - workspaces
```

### Method 3: Use Supabase Studio
1. Start Supabase: `supabase start`
2. Open Studio: `http://localhost:54323`
3. Check "Table Editor" to see if all tables exist

## If Migrations Haven't Been Applied

If you need to apply migrations manually:

```bash
# Option 1: Reset and apply all migrations
supabase db reset

# Option 2: Apply pending migrations only
supabase migration up

# Option 3: Start Supabase (applies migrations automatically)
supabase start
```

## Important Notes

1. **No `migration.sql` file exists** - Migrations are in individual files in `supabase/migrations/`
2. **Migrations are timestamped** - They run in chronological order
3. **Migrations are idempotent** - Running them multiple times is safe
4. **`supabase start` applies migrations automatically** - No manual step needed

## Current Status

To check if migrations have been applied to your local database:

```bash
# Check Supabase status
npm run supabase:status

# Or directly
supabase status
```

If Supabase is running and migrations were applied, you should see:
- ✅ API URL: `http://localhost:54321`
- ✅ DB URL: `postgresql://postgres:postgres@localhost:54322/postgres`
- ✅ Studio URL: `http://localhost:54323`

## Troubleshooting

### Migrations not applied?
```bash
# Reset database and reapply all migrations
supabase db reset
```

### Check migration errors?
```bash
# View Supabase logs
supabase logs
```

### Verify specific migration?
```bash
# Check migration history
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;"
```

