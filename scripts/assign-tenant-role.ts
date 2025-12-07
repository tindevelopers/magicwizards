/**
 * Script to assign a tenant role to a Platform Admin
 * Usage: npx tsx scripts/assign-tenant-role.ts <email> <tenant-id> <role-name>
 * 
 * Example:
 *   npx tsx scripts/assign-tenant-role.ts systemadmin@tin.info <tenant-uuid> "Organization Admin"
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin-client";
import { assignTenantRole } from "@/lib/supabase/user-tenant-roles";

async function assignRole(email: string, tenantId: string, roleName: string) {
  const adminClient = createAdminClient();

  console.log(`\n🔍 Looking up user: ${email}...`);

  // Find user by email
  const { data: user, error: userError } = await adminClient
    .from("users")
    .select("id, email, full_name, role_id, tenant_id, roles:role_id(name)")
    .eq("email", email)
    .maybeSingle();

  if (userError) {
    console.error("❌ Error finding user:", userError);
    process.exit(1);
  }

  if (!user) {
    console.error(`❌ User with email ${email} not found`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.full_name} (${user.email})`);
  console.log(`   Platform role: ${(user.roles as any)?.name || "None"}`);
  console.log(`   Tenant ID: ${user.tenant_id || "None (Platform Admin)"}`);

  // Verify tenant exists
  console.log(`\n🔍 Verifying tenant: ${tenantId}...`);
  const { data: tenant, error: tenantError } = await adminClient
    .from("tenants")
    .select("id, name, domain")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) {
    console.error(`❌ Tenant ${tenantId} not found:`, tenantError);
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name} (${tenant.domain})`);

  // Assign tenant role
  console.log(`\n🔄 Assigning "${roleName}" role for tenant "${tenant.name}"...`);
  try {
    const result = await assignTenantRole(user.id, tenantId, roleName);
    console.log(`\n✅ Successfully assigned tenant role!`);
    console.log(`\n📋 Assignment details:`);
    console.log(`   User: ${user.full_name} (${user.email})`);
    console.log(`   Platform Role: ${(user.roles as any)?.name || "None"}`);
    console.log(`   Tenant Role: ${roleName}`);
    console.log(`   Tenant: ${tenant.name} (${tenant.domain})`);
    console.log(`\n🎉 User now has both Platform Admin and ${roleName} roles!`);
  } catch (error: any) {
    if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
      console.log(`\n⚠️  Role already assigned. User already has "${roleName}" role for this tenant.`);
    } else {
      console.error(`\n❌ Error assigning role:`, error.message || error);
      process.exit(1);
    }
  }
}

// Get command line arguments
const email = process.argv[2];
const tenantId = process.argv[3];
const roleName = process.argv[4] || "Organization Admin";

if (!email || !tenantId) {
  console.error("Usage: npx tsx scripts/assign-tenant-role.ts <email> <tenant-id> [role-name]");
  console.error("\nExample:");
  console.error('  npx tsx scripts/assign-tenant-role.ts systemadmin@tin.info <tenant-uuid> "Organization Admin"');
  process.exit(1);
}

assignRole(email, tenantId, roleName).catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});

