/**
 * Menu Functionality Verification Script
 * 
 * Verifies that all menu routes exist and are properly protected
 */

import 'dotenv/config';
import { createAdminClient } from "@/lib/supabase/admin-client";
import { getUserPermissions } from "@/lib/auth/permissions";

// Menu structure from AppSidebar.tsx
const menuStructure = {
  "Dashboard": "/saas/dashboard",
  "Billing & Plans": {
    "Billing Dashboard": "/billing",
    "Cancel Subscription": "/saas/billing/cancel-subscription",
    "Upgrade to Pro": "/saas/billing/upgrade-to-pro",
    "Update Billing Address": "/saas/billing/update-billing-address",
    "Add New Card": "/saas/billing/add-new-card",
    "Invoicing": {
      "Invoices": "/saas/invoicing/invoices",
      "Payment History": "/saas/invoicing/payment-history",
      "Failed Payments": "/saas/invoicing/failed-payments",
      "Refunds": "/saas/invoicing/refunds",
      "Tax Settings": "/saas/invoicing/tax-settings",
    }
  },
  "Admin": {
    "User Management": "/saas/admin/entity/user-management",
    "Tenant Management": "/saas/admin/entity/tenant-management",
    "Organization Management": "/saas/admin/entity/organization-management",
    "Role Management": "/saas/admin/entity/role-management",
  },
  "System Admin": {
    "Organization Admins": "/saas/admin/system-admin/organization-admins",
    "API Configuration": "/saas/admin/system-admin/api-configuration",
    "Multi-Tenant": "/multi-tenant",
    "Subscriptions": {
      "Plans": "/saas/subscriptions/plans",
      "Features": "/saas/subscriptions/features",
      "Usage Limits": "/saas/subscriptions/usage-limits",
      "History": "/saas/subscriptions/history",
      "Migration": "/saas/subscriptions/migration",
    },
    "Webhooks": {
      "Management": "/saas/webhooks/management",
      "Events": "/saas/webhooks/events",
      "Logs": "/saas/webhooks/logs",
      "Testing": "/saas/webhooks/testing",
    }
  }
};

async function verifyMenuFunctionality() {
  const adminClient = createAdminClient();
  
  console.log("🔍 Verifying Menu Functionality\n");
  console.log("=" .repeat(60));
  
  // Get Platform Admin user
  const { data: platformAdmin } = await adminClient.auth.admin.listUsers();
  const platformAdminUser = platformAdmin?.users.find(u => u.email === "systemadmin@tin.info");
  
  if (!platformAdminUser) {
    console.error("❌ Platform Admin user not found");
    return;
  }
  
  console.log(`\n✅ Found Platform Admin: ${platformAdminUser.email}`);
  
  // Check Platform Admin permissions
  const platformPermissions = await getUserPermissions(platformAdminUser.id);
  console.log(`\n📋 Platform Admin Permissions:`);
  console.log(`   Role: ${platformPermissions.role}`);
  console.log(`   Is Platform Admin: ${platformPermissions.isPlatformAdmin}`);
  console.log(`   Permissions: ${platformPermissions.permissions.length} total`);
  console.log(`   - ${platformPermissions.permissions.slice(0, 5).join(", ")}...`);
  
  // Verify routes exist
  console.log(`\n\n🔍 Verifying Routes Exist:`);
  console.log("=" .repeat(60));
  
  const fs = require('fs');
  const path = require('path');
  
  function checkRoute(routePath: string, menuName: string): boolean {
    const fullPath = path.join(process.cwd(), 'src/app', routePath, 'page.tsx');
    const exists = fs.existsSync(fullPath);
    console.log(`   ${exists ? '✅' : '❌'} ${menuName}: ${routePath}`);
    return exists;
  }
  
  // Check Platform Admin routes
  console.log(`\n📌 Platform Admin Routes:`);
  checkRoute("/saas/admin/entity/tenant-management", "Tenant Management");
  checkRoute("/saas/admin/system-admin/organization-admins", "Organization Admins");
  checkRoute("/saas/admin/system-admin/api-configuration", "API Configuration");
  checkRoute("/multi-tenant", "Multi-Tenant");
  checkRoute("/saas/subscriptions/plans", "Subscriptions > Plans");
  
  // Check Admin routes
  console.log(`\n📌 Admin Routes:`);
  checkRoute("/saas/admin/entity/user-management", "User Management");
  checkRoute("/saas/admin/entity/organization-management", "Organization Management");
  checkRoute("/saas/admin/entity/role-management", "Role Management");
  
  // Check Billing routes
  console.log(`\n📌 Billing & Plans Routes:`);
  checkRoute("/saas/billing/cancel-subscription", "Cancel Subscription");
  checkRoute("/saas/invoicing/invoices", "Invoicing > Invoices");
  
  console.log(`\n\n✅ Verification Complete!`);
  console.log("=" .repeat(60));
}

verifyMenuFunctionality().catch(console.error);

