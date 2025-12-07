# Role Naming Updates - Google/HubSpot Style

## Summary of Changes

Updated role names to match Google Workspace and HubSpot's organization scheme for better clarity and industry alignment.

## Role Name Changes

| Old Name | New Name | Reason |
|----------|----------|--------|
| Platform Admin | **Platform Admin** (unchanged) | Already matches "Tenant Admin" concept - full platform control |
| Workspace Admin | **Organization Admin** | Better reflects managing an organization/company within the platform |
| Billing Owner | **Billing Owner** (unchanged) | Clear and matches industry standard |
| Developer | **Developer** (unchanged) | Clear and matches industry standard |
| Viewer | **Viewer** (unchanged) | Clear and matches industry standard |

## Updated Role Descriptions

### Platform Admin (Tenant Admin)
**New Description:** "Tenant Admin: Full platform control, manages all organizations, domains, billing, security policies, and system-level settings."

**Powers:**
- Full control over the entire SaaS platform
- Manage all organizations and users
- Domain and DNS configuration
- Global security policies (MFA, SSO, conditional access)
- Billing and subscription management
- Cannot be restricted by other admins

**Technical:**
- `users.tenant_id = NULL`
- Bypasses all RLS policies
- Access to all data across all organizations

---

### Organization Admin (formerly Workspace Admin)
**New Description:** "Manages their organization: users, teams, settings, and day-to-day operations within their company."

**Powers:**
- Manage users within their organization
- Create and manage teams
- Configure organization settings and workflows
- Staff onboarding/offboarding
- **Cannot** modify platform-level settings
- **Cannot** see other organizations

**Technical:**
- `users.tenant_id = <org_id>`
- Subject to RLS policies
- Access limited to their organization's data

---

## Files Updated

### Database Migrations
- `supabase/migrations/20251205120000_update_role_names.sql` - Updates role names and descriptions

### Source Code
- All TypeScript/TSX files in `src/` directory
- All scripts in `scripts/` directory
- All documentation in `docs/` directory

### Key Files Changed
- `src/lib/auth/permissions.ts`
- `src/lib/auth/permissions-client.ts`
- `src/lib/supabase/user-tenant-roles.ts`
- `src/app/actions/organization-admins.ts`
- `src/components/user-profile/*.tsx`
- All role management pages

## Migration Applied

```sql
UPDATE roles
SET 
  name = 'Organization Admin',
  description = 'Manages their organization: users, teams, settings, and day-to-day operations within their company.'
WHERE name = 'Workspace Admin';
```

## Testing

After applying these changes:

1. ✅ Platform Admin user created: `systemadmin@tin.info`
2. ✅ Sample tenant created: "Acme Corporation"
3. ✅ Organization Admin role assigned to Platform Admin for Acme tenant
4. ✅ All code references updated from "Workspace Admin" to "Organization Admin"

## Next Steps

1. Sign in as `systemadmin@tin.info` / `Admin123!`
2. Verify Platform Admin can see all organizations
3. Verify Organization Admin role works for Acme Corporation
4. Test permission system with the new role names

## References

- See `docs/ROLE_HIERARCHY.md` for detailed role hierarchy documentation
- See `docs/MULTI_ROLE_ARCHITECTURE.md` for multi-role system architecture

