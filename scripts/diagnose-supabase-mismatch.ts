#!/usr/bin/env tsx
/**
 * Script to diagnose Supabase project mismatch
 * This helps identify if Vercel is pointing to the wrong Supabase project
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const email = "systemadmin@tin.info";
const password = "88888888";

console.log("\n🔍 Supabase Project Diagnostic\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Extract project ID from URL
let supabaseProjectId = "unknown";
if (SUPABASE_URL.includes("supabase.co")) {
  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    supabaseProjectId = match[1];
  }
} else if (SUPABASE_URL.includes("localhost") || SUPABASE_URL.includes("127.0.0.1")) {
  supabaseProjectId = "local";
}

console.log("📊 Configuration:");
console.log(`   Supabase URL: ${SUPABASE_URL || "NOT SET"}`);
console.log(`   Supabase Project ID: ${supabaseProjectId}`);
console.log(`   Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET"}`);
console.log(`   Anon Key: ${SUPABASE_ANON_KEY ? "SET" : "NOT SET"}\n`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables");
  console.error("\n   Please set:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function diagnose() {
  try {
    console.log("📋 Step 1: Checking if user exists in Supabase Auth...\n");
    
    const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Error listing users:", listError.message);
      console.error("\n   This might indicate:");
      console.error("   - Wrong Supabase URL");
      console.error("   - Wrong Service Role Key");
      console.error("   - Network connectivity issues");
      process.exit(1);
    }

    const authUser = authUsers?.users?.find((u) => u.email === email);
    
    if (!authUser) {
      console.error(`❌ User ${email} NOT found in this Supabase project!\n`);
      console.error("   This confirms the issue:");
      console.error("   - Vercel is connected to a DIFFERENT Supabase project");
      console.error("   - The user exists in a different Supabase project\n");
      console.error("   Solutions:");
      console.error("   1. Create the user in this Supabase project:");
      console.error("      npx tsx scripts/create-platform-admin.ts");
      console.error("   2. OR update Vercel environment variables to point to the correct Supabase project\n");
      process.exit(1);
    }

    console.log(`✅ User found in Auth:`);
    console.log(`   - User ID: ${authUser.id}`);
    console.log(`   - Email: ${authUser.email}`);
    console.log(`   - Email Confirmed: ${authUser.email_confirmed_at ? "Yes" : "No"}`);
    console.log(`   - Created: ${authUser.created_at}\n`);

    // Test login
    console.log("📋 Step 2: Testing login with credentials...\n");
    
    const regularClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || "");
    
    const { data: loginData, error: loginError } = await regularClient.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.error(`❌ Login FAILED:`);
      console.error(`   Error: ${loginError.message}`);
      console.error(`   Status: ${loginError.status}`);
      console.error(`   Code: ${loginError.status === 400 ? "invalid_credentials" : "unknown"}\n`);
      
      if (loginError.message.includes("Invalid login credentials")) {
        console.error("   ⚠️  ISSUE IDENTIFIED:");
        console.error("   The password is incorrect for this Supabase project.\n");
        console.error("   Possible causes:");
        console.error("   1. Password was changed in Supabase");
        console.error("   2. User was created with a different password");
        console.error("   3. Password reset was performed\n");
        console.error("   Solutions:");
        console.error("   1. Reset password in Supabase Dashboard");
        console.error("   2. Recreate user with correct password:");
        console.error("      npx tsx scripts/create-platform-admin.ts");
        console.error("   3. Update password using Supabase Admin API\n");
      }
      process.exit(1);
    }

    console.log(`✅ Login SUCCESSFUL!`);
    console.log(`   - User ID: ${loginData.user.id}`);
    console.log(`   - Email: ${loginData.user.email}\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Credentials are working correctly in this Supabase project!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📊 Summary:");
    console.log(`   Supabase Project ID: ${supabaseProjectId}`);
    console.log(`   Supabase URL: ${SUPABASE_URL}`);
    console.log(`   User: ${email}`);
    console.log(`   Status: ✅ Working\n`);
    console.log("💡 If Vercel is still failing, check:");
    console.log("   1. Vercel environment variables match the above configuration");
    console.log("   2. Vercel deployment has been redeployed after env var changes");
    console.log("   3. No typos in environment variable names\n");

  } catch (error: any) {
    console.error("❌ Unexpected error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

diagnose().catch(console.error);

