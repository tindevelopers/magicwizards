# Multi-Role Architecture for Platform Admins

## Current Limitation

Currently, the system uses a single `role_id` field in the `users` table, which means:
- A user can only have **one role** at a time
- Platform Admins have `tenant_id = NULL` (system-level)
- Organization Admins have a specific `tenant_id` (tenant-level)

## Problem

Platform Admins need to:
1. **Platform Admin role**: System-level access to manage all tenants, users, and platform settings
2. **Organization Admin role**: Tenant-specific access to manage individual tenants as Organization Admins

## Solution Options

### Option 1: User-Tenant Roles Junction Table (Recommended)

Create a `user_tenant_roles` table to allow Platform Admins to have tenant-specific roles:

```sql
CREATE TABLE user_tenant_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, role_id)
);

CREATE INDEX idx_user_tenant_roles_user_id ON user_tenant_roles(user_id);
CREATE INDEX idx_user_tenant_roles_tenant_id ON user_tenant_roles(tenant_id);
CREATE INDEX idx_user_tenant_roles_role_id ON user_tenant_roles(role_id);
```

**How it works:**
- Platform Admin role stays in `users.role_id` (for system-level access)
- Tenant-specific roles stored in `user_tenant_roles` table
- When accessing tenant data, check both `users.role_id` (Platform Admin) and `user_tenant_roles` (tenant roles)

**Benefits:**
- ✅ Platform Admins keep system-level access
- ✅ Can have different roles for different tenants
- ✅ Clear separation of platform vs tenant roles
- ✅ Easy to query "what roles does this user have for this tenant?"

### Option 2: Role Hierarchy (Simpler but less flexible)

Keep Platform Admin as primary role, but grant Organization Admin permissions when accessing tenant data:

```typescript
function getUserEffectiveRole(userId: string, tenantId?: string): Role {
  const user = getUser(userId);
  
  // If Platform Admin, they can act as Organization Admin for any tenant
  if (user.role_id === PLATFORM_ADMIN_ROLE_ID) {
    if (tenantId) {
      return WORKSPACE_ADMIN_ROLE; // Effective role for tenant context
    }
    return PLATFORM_ADMIN_ROLE; // System-level access
  }
  
  return user.role_id; // Regular user role
}
```

**Benefits:**
- ✅ No schema changes needed
- ✅ Platform Admins automatically have Organization Admin permissions
- ❌ Less flexible (can't have different roles per tenant)
- ❌ Harder to audit "who has what role for which tenant"

### Option 3: Many-to-Many User Roles (Most Flexible)

Create a `user_roles` junction table for all roles:

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for Platform Admin
  scope VARCHAR(50) NOT NULL CHECK (scope IN ('platform', 'tenant')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id, tenant_id)
);
```

**Benefits:**
- ✅ Most flexible - can have multiple roles
- ✅ Clear scope (platform vs tenant)
- ❌ More complex queries
- ❌ Requires significant refactoring

## Recommended Implementation: Option 1

### Migration Steps

1. **Create `user_tenant_roles` table**
2. **Update permission checks** to look at both `users.role_id` and `user_tenant_roles`
3. **Update RLS policies** to allow Platform Admins with tenant roles
4. **Create helper functions** to get effective role for a tenant

### Example Usage

```typescript
// Assign Organization Admin role to Platform Admin for a tenant
await assignTenantRole(userId, tenantId, 'Organization Admin');

// Get effective role for a user in a tenant context
const effectiveRole = await getEffectiveRole(userId, tenantId);
// Returns: 'Organization Admin' if they have tenant role, otherwise checks platform role

// Check permissions
const canManageTenant = await hasPermission(userId, 'tenants.write', { tenantId });
// Checks both platform role and tenant role
```

## Implementation Plan

1. ✅ Create migration for `user_tenant_roles` table
2. ✅ Update `getEffectiveRole()` function
3. ✅ Update permission middleware to check tenant roles
4. ✅ Update RLS policies
5. ✅ Create UI for assigning tenant roles to Platform Admins
   - ✅ Created `AssignTenantRoleModal` component
   - ✅ Added server actions for tenant role management
   - ✅ Integrated modal into user management page
6. ✅ Update user management to show both platform and tenant roles
   - ✅ Shows platform role (primary)
   - ✅ Shows tenant-specific roles below platform role
   - ✅ Icon button to assign tenant roles (Platform Admins only)

