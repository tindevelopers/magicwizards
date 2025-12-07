/**
 * Script to create a Platform Admin user
 * Usage: npx tsx scripts/create-platform-admin.ts <email> <password> <full-name>
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin-client";

async function createPlatformAdmin(email: string, password: string, fullName: string) {
  const adminClient = createAdminClient();

  console.log(`\n🔍 Creating Platform Admin user...`);

  // 1. Sign up user with Supabase Auth
  console.log(`\n1️⃣ Creating auth user...`);
  const { data: authData, error: authError } = await adminClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError || !authData.user) {
    if (authError?.message?.includes("already registered")) {
      console.log(`⚠️  User ${email} already exists in auth. Continuing...`);
      // Get existing user
      const { data: existingUser } = await adminClient.auth.admin.getUserByEmail(email);
      if (!existingUser?.user) {
        throw new Error("User exists but could not retrieve");
      }
      authData.user = existingUser.user;
    } else {
      throw authError || new Error("Failed to create auth user");
    }
  }

  console.log(`✅ Auth user created: ${authData.user.id}`);

  // 2. Get Platform Admin role
  console.log(`\n2️⃣ Getting Platform Admin role...`);
  const { data: platformAdminRole, error: roleError } = await adminClient
    .from("roles")
    .select("id, name")
    .eq("name", "Platform Admin")
    .single();

  if (roleError || !platformAdminRole) {
    throw new Error("Platform Admin role not found. Make sure roles are seeded.");
  }

  console.log(`✅ Found role: ${platformAdminRole.name} (${platformAdminRole.id})`);

  // 3. Check if user already exists in users table
  console.log(`\n3️⃣ Checking if user exists in users table...`);
  const { data: existingUser } = await adminClient
    .from("users")
    .select("id, email, role_id, tenant_id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (existingUser) {
    console.log(`⚠️  User already exists in users table. Updating to Platform Admin...`);
    const { data: updatedUser, error: updateError } = await adminClient
      .from("users")
      .update({
        role_id: platformAdminRole.id,
        tenant_id: null, // Platform Admins have null tenant_id
        email,
        full_name: fullName,
      })
      .eq("id", authData.user.id)
      .select(`
        *,
        roles:role_id(name)
      `)
      .single();

    if (updateError) throw updateError;
    console.log(`\n✅ Updated user to Platform Admin!`);
    console.log(`\n📋 User details:`);
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Name: ${updatedUser.full_name}`);
    console.log(`   Role: ${(updatedUser.roles as any)?.name}`);
    console.log(`   Tenant ID: ${updatedUser.tenant_id || "None (Platform Admin)"}`);
    return updatedUser;
  }

  // 4. Create user record in users table
  console.log(`\n4️⃣ Creating user record...`);
  const { data: user, error: userError } = await adminClient
    .from("users")
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role_id: platformAdminRole.id,
      tenant_id: null, // Platform Admins have null tenant_id
      plan: "enterprise",
      status: "active",
    })
    .select(`
      *,
      roles:role_id(name)
    `)
    .single();

  if (userError) {
    // If user already exists, try to update
    if (userError.code === "23505") {
      console.log(`⚠️  User already exists. Updating...`);
      const { data: updatedUser, error: updateError } = await adminClient
        .from("users")
        .update({
          role_id: platformAdminRole.id,
          tenant_id: null,
        })
        .eq("id", authData.user.id)
        .select(`
          *,
          roles:role_id(name)
        `)
        .single();

      if (updateError) throw updateError;
      console.log(`\n✅ Updated user to Platform Admin!`);
      console.log(`\n📋 User details:`);
      console.log(`   ID: ${updatedUser.id}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Name: ${updatedUser.full_name}`);
      console.log(`   Role: ${(updatedUser.roles as any)?.name}`);
      console.log(`   Tenant ID: ${updatedUser.tenant_id || "None (Platform Admin)"}`);
      return updatedUser;
    }
    throw userError;
  }

  console.log(`\n✅ Platform Admin created successfully!`);
  console.log(`\n📋 User details:`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.full_name}`);
  console.log(`   Role: ${(user.roles as any)?.name}`);
  console.log(`   Tenant ID: ${user.tenant_id || "None (Platform Admin)"}`);
  console.log(`\n🎉 User can now sign in and has Platform Admin access!`);

  return user;
}

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || "Platform Admin";

if (!email || !password) {
  console.error("Usage: npx tsx scripts/create-platform-admin.ts <email> <password> [full-name]");
  console.error("\nExample:");
  console.error('  npx tsx scripts/create-platform-admin.ts systemadmin@tin.info "SecurePassword123!" "Jane Doe"');
  process.exit(1);
}

createPlatformAdmin(email, password, fullName).catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});

