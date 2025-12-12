# Menu Functionality Verification - Platform Admin vs Organization Admin

## Overview
This document verifies that menus are functional and properly restricted based on user roles.

## Current Menu Structure

### Top-Level Menus (All Users See)
- Dashboard → `/saas/dashboard`
- AI Assistant (submenu)
- E-commerce (submenu)
- **Billing & Plans** (submenu)
- **Admin** (submenu)
- **System Admin** (submenu)
- SaaS (submenu)
- Calendar → `/calendar`
- User Profile → `/profile`
- Task (submenu)
- Forms (submenu)
- Tables (submenu)
- Pages (submenu)

---

## Platform Admin (Tenant Admin) - Expected Access

### ✅ Should Have Access To:

#### 1. **Full Platform Control**
- ✅ **System Admin** menu (all items)
  - Organization Admins → `/saas/admin/system-admin/organization-admins`
  - API Configuration → `/saas/admin/system-admin/api-configuration`
  - Multi-Tenant → `/multi-tenant`
  - Subscriptions (all items)
  - Webhooks (all items)

#### 2. **Manages ALL Organizations**
- ✅ **Admin** menu (all items)
  - User Management → `/saas/admin/entity/user-management` (sees ALL users)
  - Tenant Management → `/saas/admin/entity/tenant-management` (sees ALL tenants)
  - Organization Management → `/saas/admin/entity/organization-management` (sees ALL orgs)
  - Role Management → `/saas/admin/entity/role-management` (manages ALL roles)

#### 3. **Domain & Billing Management**
- ✅ **Billing & Plans** menu (all items)
  - Billing Dashboard → `/billing`
  - Cancel Subscription → `/saas/billing/cancel-subscription`
  - Upgrade to Pro → `/saas/billing/upgrade-to-pro`
  - Update Billing Address → `/saas/billing/update-billing-address`
  - Add New Card → `/saas/billing/add-new-card`
  - Invoicing (all items)

#### 4. **Global Security Policies**
- ✅ **SaaS > Security** menu (all items)
  - Settings → `/saas/security/settings`
  - SSO Configuration → `/saas/security/sso-configuration`
  - Session Management → `/saas/security/session-management`
  - IP Restrictions → `/saas/security/ip-restrictions`
  - Audit Logs → `/saas/security/audit-logs`
  - Compliance → `/saas/security/compliance`

#### 5. **Cannot Be Restricted**
- ✅ Platform Admin bypasses all RLS policies
- ✅ Has all permissions regardless of tenant context
- ✅ Can access any route in the system

---

## Organization Admin (Company-Level) - Expected Access

### ✅ Should Have Access To:

#### 1. **Manages THEIR Organization Only**
- ✅ **Admin** menu (limited items)
  - User Management → `/saas/admin/entity/user-management` (sees ONLY their org's users)
  - Organization Management → `/saas/admin/entity/organization-management` (sees ONLY their org)
  - Role Management → `/saas/admin/entity/role-management` (manages roles within their org)
  - ❌ Tenant Management → Should NOT see this (Platform Admin only)

#### 2. **User & Team Management**
- ✅ User Management → `/saas/admin/entity/user-management`
- ✅ Organization Management → `/saas/admin/entity/organization-management`
- ✅ Role Management → `/saas/admin/entity/role-management`

#### 3. **Organization Settings**
- ✅ **SaaS** menu (most items)
  - Dashboard → `/saas/dashboard`
  - User Profile → `/saas/userprofile`
  - Usage & Metering (all items)
  - Security (org-level settings only)
  - Email & Notifications
  - Support
  - Feature Flags
  - Analytics
  - Integrations
  - Data Management
  - Custom Report Builder
  - White-Label

#### 4. **Staff Operations**
- ✅ User Management (onboarding/offboarding)
- ✅ Role assignments within their organization
- ✅ Team management

#### 5. **Cannot See Other Orgs**
- ✅ RLS policies restrict data to their `tenant_id`
- ✅ Cannot access other organizations' data
- ❌ Cannot see Tenant Management (Platform Admin only)
- ❌ Cannot see System Admin menu (Platform Admin only)

---

## Current Implementation Status

### ✅ What's Working:

1. **Permission System**
   - ✅ `getUserPermissions()` correctly identifies Platform Admin
   - ✅ Platform Admin gets all permissions
   - ✅ Organization Admin gets tenant-scoped permissions
   - ✅ Server-side permission checks (`requirePermission`) are in place

2. **Route Protection**
   - ✅ Server actions use `requirePermission()` to check access
   - ✅ Permission gates exist for UI components
   - ✅ RLS policies enforce tenant isolation

3. **Menu Structure**
   - ✅ Menus are defined in `AppSidebar.tsx`
   - ✅ Routes exist for all menu items

### ⚠️ What Needs Improvement:

1. **Menu Filtering**
   - ⚠️ **ISSUE**: Sidebar currently shows ALL menus to ALL users
   - ⚠️ No client-side filtering based on user role
   - ⚠️ Users can see menu items they can't access

2. **Route-Level Protection**
   - ⚠️ Some routes may not have permission checks at the page level
   - ⚠️ Need to verify all routes are protected

---

## Verification Checklist

### Platform Admin Verification:

- [ ] Can access `/saas/admin/entity/tenant-management` (should see ALL tenants)
- [ ] Can access `/saas/admin/system-admin/organization-admins` (should see ALL org admins)
- [ ] Can access `/saas/admin/entity/user-management` (should see ALL users)
- [ ] Can access `/multi-tenant` (Platform Admin only)
- [ ] Can access `/saas/subscriptions/plans` (Platform Admin only)
- [ ] Cannot be restricted by RLS policies
- [ ] Has access to all billing/invoicing features

### Organization Admin Verification:

- [ ] Can access `/saas/admin/entity/user-management` (should see ONLY their org's users)
- [ ] Can access `/saas/admin/entity/organization-management` (should see ONLY their org)
- [ ] Cannot access `/saas/admin/entity/tenant-management` (should get permission denied)
- [ ] Cannot access `/saas/admin/system-admin/organization-admins` (should get permission denied)
- [ ] Cannot access `/multi-tenant` (should get permission denied)
- [ ] Cannot access `/saas/subscriptions/plans` (should get permission denied)
- [ ] Can only see data for their `tenant_id`
- [ ] RLS policies restrict access correctly

---

## Recommendations

1. **Add Menu Filtering**: Implement client-side menu filtering based on user permissions
2. **Add Route Guards**: Add permission checks at the page level (not just server actions)
3. **Add Visual Indicators**: Show which menus are restricted based on role
4. **Add Error Handling**: Better error messages when users try to access restricted routes

---

## Testing Steps

1. **Test as Platform Admin** (`systemadmin@tin.info`):
   ```bash
   # Sign in and verify:
   - All menus are visible
   - Can access all routes
   - Can see all tenants/organizations/users
   ```

2. **Test as Organization Admin**:
   ```bash
   # Create an Organization Admin user
   # Sign in and verify:
   - System Admin menu is NOT visible
   - Tenant Management is NOT accessible
   - Can only see their organization's data
   ```

3. **Test Permission Checks**:
   ```bash
   # Try accessing restricted routes
   # Verify proper error messages
   # Check server logs for permission checks
   ```




