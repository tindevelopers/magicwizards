# V2 Enhancement: Menu Permission Filtering

## Overview

Currently, the sidebar navigation shows all menu items to all users, regardless of their permissions. While routes are protected at the page level (users cannot access pages they don't have permission for), the menu items are visible to everyone.

## Current Implementation

### Route Protection
- ✅ Routes are protected using `requirePermission()` middleware
- ✅ Server actions check permissions before executing
- ✅ RLS policies enforce data-level access control
- ✅ Protected route components redirect unauthorized users

### Menu Display
- ⚠️ All menu items are shown to all users
- ⚠️ No client-side filtering based on user role/permissions
- ⚠️ Users see menu items they cannot access (but clicking redirects them)

## Impact

**Low Priority for V1:**
- Routes are protected, so security is not compromised
- Users simply see menu items they can't use
- This is a UX improvement, not a security requirement

## Proposed V2 Implementation

### 1. Add Permission Metadata to Navigation Config

Update `apps/admin/config/navigation.tsx`:

```typescript
export type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  new?: boolean;
  pro?: boolean;
  subItems?: NavItem[];
  // V2: Add permission requirements
  requiredRole?: string[]; // e.g., ['Platform Admin']
  requiredPermission?: Permission[]; // e.g., ['tenants.write']
};
```

### 2. Create Menu Filtering Hook

Create `apps/admin/hooks/useFilteredNavigation.ts`:

```typescript
import { useMemo } from 'react';
import { usePermissions } from '@/core/permissions';
import type { NavItem } from '@/config/navigation';

export function useFilteredNavigation(items: NavItem[]): NavItem[] {
  const { permissions, role } = usePermissions();
  
  return useMemo(() => {
    return items.filter(item => {
      // Check role requirement
      if (item.requiredRole && !item.requiredRole.includes(role)) {
        return false;
      }
      
      // Check permission requirement
      if (item.requiredPermission) {
        const hasPermission = item.requiredPermission.some(perm => 
          permissions.includes(perm)
        );
        if (!hasPermission) {
          return false;
        }
      }
      
      // Filter sub-items recursively
      if (item.subItems) {
        item.subItems = useFilteredNavigation(item.subItems);
      }
      
      return true;
    });
  }, [items, permissions, role]);
}
```

### 3. Update AppSidebar Component

Update `apps/admin/layout/AppSidebar.tsx` to use filtered navigation:

```typescript
import { useFilteredNavigation } from '@/hooks/useFilteredNavigation';
import { getNavigationItems } from '@/config/navigation';

const { main, support, others } = getNavigationItems();
const filteredMain = useFilteredNavigation(main);
const filteredSupport = useFilteredNavigation(support);
const filteredOthers = useFilteredNavigation(others);
```

### 4. Add Permission Requirements to Navigation Items

Example:

```typescript
export const mainNavItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/saas/dashboard",
  },
  {
    icon: <UserCircleIcon />,
    name: "Admin",
    subItems: [
      {
        name: "Tenant Management",
        path: "/saas/admin/entity/tenant-management",
        requiredRole: ["Platform Admin"], // V2
      },
      {
        name: "User Management",
        path: "/saas/admin/entity/user-management",
        requiredPermission: ["users.read"], // V2
      },
    ],
  },
];
```

## Testing Checklist

- [ ] Platform Admin sees all menu items
- [ ] Organization Admin sees only tenant-scoped items
- [ ] Regular users see only items they have permission for
- [ ] Menu updates when permissions change
- [ ] Sub-menus are filtered correctly
- [ ] Performance is acceptable (no lag when filtering)

## Related Files

- `apps/admin/config/navigation.tsx` - Navigation configuration
- `apps/admin/layout/AppSidebar.tsx` - Sidebar component
- `apps/admin/hooks/useFilteredNavigation.ts` - Filtering hook (to be created)
- `packages/@tinadmin/core/src/permissions/` - Permission utilities

## Notes

- This enhancement improves UX but is not critical for V1
- Routes remain protected regardless of menu visibility
- Consider caching permission checks to avoid performance issues
- May want to show a loading state while permissions are being checked

