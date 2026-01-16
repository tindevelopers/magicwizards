#!/usr/bin/env tsx
/**
 * Script to test systemadmin@tin.info login credentials
 * Run with: npx tsx scripts/test-systemadmin-login.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables from .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Extract project ID from Supabase URL
// Format: https://<project-id>.supabase.co or http://localhost:54321
let supabaseProjectId = "local";
if (SUPABASE_URL.includes("supabase.co")) {
  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    supabaseProjectId = match[1];
  }
}

console.log(`\n📊 Supabase Configuration:`);
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Project ID: ${supabaseProjectId}\n`);

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set");
  console.error("\n   For local development:");
  console.error("   Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key");
  console.error("   Get it from: supabase status");
  console.error("\n   For Vercel/production:");
  console.error("   Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables");
  console.error("   Get it from: Supabase Dashboard → Settings → API → service_role key");
  process.exit(1);
}

const email = "systemadmin@tin.info";
const password = "88888888";

async function testSystemAdminLogin() {
  console.log(`\n🔍 Testing System Admin Login Credentials\n`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}\n`);

  // Create Supabase admin client
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Check if user exists in Auth
    console.log("📋 Step 1: Checking if user exists in Supabase Auth...");
    const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Error listing users:", listError);
      process.exit(1);
    }

    const authUser = authUsers?.users?.find((u) => u.email === email);
    
    if (!authUser) {
      console.error(`❌ User ${email} NOT found in Supabase Auth`);
      console.error("\n   The user needs to be created first.");
      console.error("   Run: npx tsx scripts/create-platform-admin.ts");
      process.exit(1);
    }

    console.log(`✅ User found in Auth:`);
    console.log(`   - User ID: ${authUser.id}`);
    console.log(`   - Email: ${authUser.email}`);
    console.log(`   - Email Confirmed: ${authUser.email_confirmed_at ? "Yes" : "No"}`);
    console.log(`   - Created: ${authUser.created_at}\n`);

    // 2. Check if user exists in users table
    console.log("📋 Step 2: Checking if user exists in users table...");
    const { data: dbUser, error: dbError } = await adminClient
      .from("users")
      .select(`
        *,
        roles:role_id (
          id,
          name,
          description
        )
      `)
      .eq("id", authUser.id)
      .single();

    if (dbError || !dbUser) {
      console.error(`❌ User NOT found in users table`);
      console.error(`   Error: ${dbError?.message || "User not found"}`);
      console.error("\n   The user record needs to be created.");
      console.error("   Run: npx tsx scripts/create-platform-admin.ts");
      process.exit(1);
    }

    console.log(`✅ User found in users table:`);
    console.log(`   - User ID: ${dbUser.id}`);
    console.log(`   - Email: ${dbUser.email}`);
    console.log(`   - Full Name: ${dbUser.full_name || "N/A"}`);
    console.log(`   - Role ID: ${dbUser.role_id || "NULL"}`);
    console.log(`   - Role Name: ${(dbUser.roles as any)?.name || "None"}`);
    console.log(`   - Tenant ID: ${dbUser.tenant_id || "NULL (Platform Admin)"}`);
    console.log(`   - Status: ${dbUser.status || "N/A"}\n`);

    // 3. Verify Platform Admin role
    const roleName = (dbUser.roles as any)?.name;
    if (roleName !== "Platform Admin") {
      console.warn(`⚠️  Warning: User role is "${roleName || "None"}", expected "Platform Admin"`);
    } else {
      console.log(`✅ User has Platform Admin role\n`);
    }

    // 4. Test login with credentials
    console.log("📋 Step 3: Testing login with credentials...");
    
    // Create a regular client (not admin) to test actual login
    const regularClient = createClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ""
    );

    const { data: loginData, error: loginError } = await regularClient.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.error(`❌ Login FAILED:`);
      console.error(`   Error: ${loginError.message}`);
      console.error(`   Status: ${loginError.status}`);
      
      // Common error messages
      if (loginError.message.includes("Invalid login credentials")) {
        console.error("\n   Possible issues:");
        console.error("   1. Password is incorrect");
        console.error("   2. User password was changed");
        console.error("   3. User account is disabled");
      } else if (loginError.message.includes("Email not confirmed")) {
        console.error("\n   Issue: Email is not confirmed");
        console.error("   Solution: User needs to confirm email or use admin client to confirm");
      }
      
      process.exit(1);
    }

    if (!loginData.user || !loginData.session) {
      console.error(`❌ Login returned no user or session`);
      process.exit(1);
    }

    console.log(`✅ Login SUCCESSFUL:`);
    console.log(`   - User ID: ${loginData.user.id}`);
    console.log(`   - Email: ${loginData.user.email}`);
    console.log(`   - Session Token: ${loginData.session.access_token.substring(0, 20)}...\n`);

    // 5. Verify session works
    console.log("📋 Step 4: Verifying session...");
    const { data: sessionUser, error: sessionError } = await regularClient.auth.getUser();
    
    if (sessionError || !sessionUser.user) {
      console.error(`❌ Session verification FAILED:`);
      console.error(`   Error: ${sessionError?.message || "No user"}`);
      process.exit(1);
    }

    console.log(`✅ Session verified:`);
    console.log(`   - User ID: ${sessionUser.user.id}`);
    console.log(`   - Email: ${sessionUser.user.email}\n`);

    // Summary
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL CHECKS PASSED - Credentials are working correctly!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📊 Supabase Project Information:");
    console.log(`   Project ID: ${supabaseProjectId}`);
    console.log(`   URL: ${SUPABASE_URL}\n`);
    console.log("📧 Login Credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);
    console.log("🎉 The user can successfully log in.\n");

  } catch (error: any) {
    console.error("❌ Unexpected error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

testSystemAdminLogin().catch(console.error);

