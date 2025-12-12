# Codebase Refactoring Documentation

This document describes the refactoring efforts focused on enforcing client/server boundaries, consistent layouts, navigational config, and CI guardrails.

## Overview

The refactoring addresses four main areas:

1. **Client/Server Boundaries**: Enforcing strict separation between client and server code
2. **Consistent Layouts**: Standardizing layout usage across routes
3. **Navigational Config**: Centralizing navigation configuration
4. **CI Guardrails**: Adding automated checks to prevent regressions

## 1. Client/Server Boundaries

### Problem

Previously, server-only modules were being imported into client components, causing build errors and runtime issues. The codebase had inconsistent patterns for handling server-only code.

### Solution

#### Server-Only Module Structure

Server-only modules are clearly marked and should be imported directly from their specific paths:

```typescript
// ✅ Correct - Server Component/Action
import { getCurrentTenant } from "@/core/multi-tenancy/server";
import { getAllUsers } from "@/core/database/users";

// ❌ Incorrect - Client Component
import { getCurrentTenant } from "@/core/multi-tenancy"; // Not exported from index
```

#### Server-Only Modules

The following modules are server-only and should NOT be imported in client components:

- `@/core/database/server`
- `@/core/multi-tenancy/server`
- `@/core/billing/checkout`
- `@/core/billing/subscriptions`
- `@/core/billing/usage`
- `@/core/database/users`
- `@/core/database/organization-admins`
- `@/core/database/user-tenant-roles`
- `@/core/database/workspaces`
- `@/core/multi-tenancy/white-label`

#### Validation

Run validation script to check for violations:

```bash
npm run validate:server-imports
```

#### ESLint Rules

ESLint rules warn when server-only modules are imported. See `eslint.config.mjs` for details.

## 2. Consistent Layouts

### Problem

Multiple duplicate layout files existed (`(admin)/layout.tsx`, `dashboard/layout.tsx`, `admin/layout.tsx`, `saas/layout.tsx`), all with identical code. Routes were inconsistently placed in layout groups.

### Solution

#### Shared AdminLayout Component

Created `src/layout/AdminLayout.tsx` - a shared layout component used by all admin routes:

```typescript
import AdminLayout from "@/layout/AdminLayout";

export default function Layout({ children }) {
  return <AdminLayout>{children}</AdminLayout>;
}
```

#### Layout Groups

Routes should be organized into layout groups:

- **`(admin)`**: All admin routes with sidebar (most routes)
- **`(full-width-pages)`**: Auth pages, error pages, landing pages
- **Root**: Public pages without sidebar

#### Route Placement Rules

- Admin routes → `src/app/(admin)/`
- Full-width routes → `src/app/(full-width-pages)/`
- Public routes → `src/app/` (root)

#### Validation

Run validation script to check layout consistency:

```bash
npm run validate:layouts
```

## 3. Navigational Config

### Problem

Navigation items were hardcoded directly in `AppSidebar.tsx`, making it difficult to:
- Update navigation across the app
- Add permission-based filtering
- Generate breadcrumbs
- Test navigation logic

### Solution

#### Centralized Navigation Config

Created `src/config/navigation.ts` with all navigation items:

```typescript
import { getNavigationItems } from "@/config/navigation";

const { main, support, others } = getNavigationItems();
```

#### Navigation Structure

Navigation is organized into three sections:

1. **Main**: Primary navigation items (Dashboard, Admin, SaaS, etc.)
2. **Support**: Support-related items (Chat, Support, Email)
3. **Others**: Additional items (Charts, UI Elements, Authentication)

#### Future Enhancements

The navigation config can be extended with:

- Permission-based filtering
- Role-based visibility
- Dynamic menu generation
- Breadcrumb generation

#### Usage

```typescript
import { getNavigationItems, findNavItemByPath } from "@/config/navigation";

// Get all navigation items
const nav = getNavigationItems();

// Find item by path (useful for breadcrumbs)
const item = findNavItemByPath("/saas/dashboard");
```

## 4. CI Guardrails

### Problem

Build errors and layout issues were discovered late in the development cycle, causing delays and merge conflicts.

### Solution

#### Validation Scripts

Two validation scripts were created:

1. **`scripts/validate-server-imports.js`**: Checks for server-only imports in client components
2. **`scripts/validate-layouts.js`**: Validates route layout assignments

#### NPM Scripts

Added to `package.json`:

```json
{
  "validate:server-imports": "node scripts/validate-server-imports.js",
  "validate:layouts": "node scripts/validate-layouts.js",
  "validate": "npm run validate:server-imports && npm run validate:layouts",
  "ci": "npm run type-check && npm run lint && npm run validate && npm run build"
}
```

#### CI Integration

Run full validation in CI:

```bash
npm run ci
```

This runs:
1. Type checking (`tsc --noEmit`)
2. Linting (`next lint`)
3. Server import validation
4. Layout validation
5. Build (`next build`)

## Migration Guide

### For New Routes

1. **Determine layout type**:
   - Admin route → Place in `src/app/(admin)/`
   - Full-width route → Place in `src/app/(full-width-pages)/`

2. **Create layout file** (if needed):
   ```typescript
   import AdminLayout from "@/layout/AdminLayout";
   export default function Layout({ children }) {
     return <AdminLayout>{children}</AdminLayout>;
   }
   ```

3. **Add navigation** (if needed):
   - Edit `src/config/navigation.ts`
   - Add item to appropriate section (`mainNavItems`, `supportNavItems`, or `othersNavItems`)

### For Server Actions

1. **Mark as server-only**:
   ```typescript
   "use server";
   ```

2. **Import server-only modules directly**:
   ```typescript
   import { getCurrentTenant } from "@/core/multi-tenancy/server";
   ```

3. **Do NOT export from barrel files** (`index.ts`) if server-only

### For Client Components

1. **Mark as client component**:
   ```typescript
   "use client";
   ```

2. **Do NOT import server-only modules**

3. **Use hooks/context for client-side data**:
   ```typescript
   import { useTenant } from "@/core/multi-tenancy";
   ```

## Best Practices

### Server Components

- Use `"use server"` directive for server actions
- Import server-only modules directly from their paths
- Do not export server-only functions from barrel files

### Client Components

- Use `"use client"` directive
- Never import server-only modules
- Use hooks and context for client-side state

### Layouts

- Use shared `AdminLayout` component for admin routes
- Place routes in appropriate layout groups
- Keep layout logic centralized

### Navigation

- Update navigation in `src/config/navigation.ts`
- Use `getNavigationItems()` to access navigation
- Use `findNavItemByPath()` for breadcrumbs

## Troubleshooting

### Build Errors: "Cannot find module"

- Check if you're importing server-only modules in client components
- Run `npm run validate:server-imports` to find violations
- Ensure server-only modules are imported directly, not from barrel files

### Sidebar Not Showing

- Check if route is in `(admin)` layout group
- Verify layout file uses `AdminLayout` component
- Run `npm run validate:layouts` to check route placement

### Navigation Not Updating

- Ensure navigation changes are in `src/config/navigation.ts`
- Check that `AppSidebar.tsx` imports from `@/config/navigation`
- Restart dev server after navigation changes

## Related Files

- `src/config/navigation.ts` - Navigation configuration
- `src/layout/AdminLayout.tsx` - Shared admin layout
- `src/layout/AppSidebar.tsx` - Sidebar component (uses navigation config)
- `scripts/validate-server-imports.js` - Server import validation
- `scripts/validate-layouts.js` - Layout validation
- `eslint.config.mjs` - ESLint rules for server-only imports
