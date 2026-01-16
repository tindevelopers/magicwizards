#!/usr/bin/env tsx
/**
 * Script to verify Supabase project jruxnkslobykshunucwa
 * and check if systemadmin@tin.info exists and can login
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

// Use the confirmed Supabase project
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://jruxnkslobykshunucwa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const email = "systemadmin@tin.info";
const password = "88888888";

// Extract project ID
let supabaseProjectId = "unknown";
if (SUPABASE_URL.includes("supabase.co")) {
  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    supabaseProjectId = match[1];
  }
}

console.log("\n🔍 Verifying Supabase Project: jruxnkslobykshunucwa\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("📊 Configuration:");
console.log(`   Supabase URL: ${SUPABASE_URL}`);
console.log(`   Supabase Project ID: ${supabaseProjectId}`);
console.log(`   Expected Project ID: jruxnkslobykshunucwa\n`);

if (supabaseProjectId !== "jruxnkslobykshunucwa" && !SUPABASE_URL.includes("jruxnkslobykshunucwa")) {
  console.warn("⚠️  WARNING: The configured Supabase URL does not match project jruxnkslobykshunucwa");
  console.warn(`   Current: ${supabaseProjectId}`);
  console.warn("   Expected: jruxnkslobykshunucwa\n");
  console.log("   To test against the correct project, set:");
  console.log("   NEXT_PUBLIC_SUPABASE_URL=https://jruxnkslobykshunucwa.supabase.co\n");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set");
  console.error("\n   To verify the project, you need:");
  console.error("   1. Get Service Role Key from Supabase Dashboard:");
  console.error("      Settings → API → service_role key");
  console.error("   2. Set it as environment variable:");
  console.error("      export SUPABASE_SERVICE_ROLE_KEY=your-key-here");
  console.error("   3. Or add to .env.local:\n");
  console.error("      SUPABASE_SERVICE_ROLE_KEY=your-key-here");
  console.error("      NEXT_PUBLIC_SUPABASE_URL=https://jruxnkslobykshunucwa.supabase.co");
  console.error("      NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here\n");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verify() {
  try {
    console.log("📋 Step 1: Checking if user exists in Supabase Auth...\n");
    
    const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Error listing users:", listError.message);
      console.error("\n   This might indicate:");
      console.error("   - Wrong Supabase URL");
      console.error("   - Wrong Service Role Key");
      console.error("   - Network connectivity issues\n");
      process.exit(1);
    }

    const authUser = authUsers?.users?.find((u) => u.email === email);
    
    if (!authUser) {
      console.error(`❌ User ${email} NOT found in project ${supabaseProjectId}!\n`);
      console.error("   The user needs to be created in this project.");
      console.error("   Run: npx tsx scripts/create-platform-admin.ts\n");
      process.exit(1);
    }

    console.log(`✅ User found in Auth:`);
    console.log(`   - User ID: ${authUser.id}`);
    console.log(`   - Email: ${authUser.email}`);
    console.log(`   - Email Confirmed: ${authUser.email_confirmed_at ? "Yes" : "No"}`);
    console.log(`   - Created: ${authUser.created_at}\n`);

    // Check users table
    console.log("📋 Step 2: Checking users table...\n");
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
      console.warn(`⚠️  User NOT found in users table`);
      console.warn(`   Error: ${dbError?.message || "User not found"}\n`);
    } else {
      console.log(`✅ User found in users table:`);
      console.log(`   - User ID: ${dbUser.id}`);
      console.log(`   - Email: ${dbUser.email}`);
      console.log(`   - Full Name: ${dbUser.full_name || "N/A"}`);
      console.log(`   - Role Name: ${(dbUser.roles as any)?.name || "None"}`);
      console.log(`   - Tenant ID: ${dbUser.tenant_id || "NULL (Platform Admin)"}\n`);
    }

    // Test login
    if (!SUPABASE_ANON_KEY) {
      console.warn("⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY not set - skipping login test");
      console.warn("   Set it to test login credentials\n");
    } else {
      console.log("📋 Step 3: Testing login with credentials...\n");
      
      const regularClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      const { data: loginData, error: loginError } = await regularClient.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        console.error(`❌ Login FAILED:`);
        console.error(`   Error: ${loginError.message}`);
        console.error(`   Status: ${loginError.status}`);
        console.error(`   Code: ${(loginError as any).status === 400 ? "invalid_credentials" : "unknown"}\n`);
        
        if (loginError.message.includes("Invalid login credentials")) {
          console.error("   ⚠️  ISSUE: Password is incorrect!");
          console.error("   Solutions:");
          console.error("   1. Reset password in Supabase Dashboard");
          console.error("   2. Recreate user: npx tsx scripts/create-platform-admin.ts\n");
        }
        process.exit(1);
      }

      console.log(`✅ Login SUCCESSFUL!`);
      console.log(`   - User ID: ${loginData.user.id}`);
      console.log(`   - Email: ${loginData.user.email}\n`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ VERIFICATION COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📊 Summary:");
    console.log(`   Supabase Project ID: ${supabaseProjectId}`);
    console.log(`   Supabase URL: ${SUPABASE_URL}`);
    console.log(`   User: ${email}`);
    console.log(`   User Exists: ✅ Yes`);
    if (SUPABASE_ANON_KEY) {
      console.log(`   Login Test: ✅ Passed\n`);
    } else {
      console.log(`   Login Test: ⏭️  Skipped (no anon key)\n`);
    }
    
    console.log("💡 Next Steps:");
    console.log("   1. Verify Vercel environment variables point to this project:");
    console.log("      NEXT_PUBLIC_SUPABASE_URL=https://jruxnkslobykshunucwa.supabase.co");
    console.log("   2. Ensure Vercel has correct SUPABASE_SERVICE_ROLE_KEY");
    console.log("   3. Redeploy Vercel after updating environment variables\n");

  } catch (error: any) {
    console.error("❌ Unexpected error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

verify().catch(console.error);

