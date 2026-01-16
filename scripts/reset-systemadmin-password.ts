#!/usr/bin/env tsx
/**
 * Script to reset password for systemadmin@tin.info
 * Run with: npx tsx scripts/reset-systemadmin-password.ts
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://jruxnkslobykshunucwa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const email = "systemadmin@tin.info";
const newPassword = "88888888";

console.log("\n🔐 Resetting Password for System Admin\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("📊 Configuration:");
console.log(`   Supabase URL: ${SUPABASE_URL}`);

// Verify which Supabase is being used
if (SUPABASE_URL.includes("jruxnkslobykshunucwa")) {
  console.log(`   ✅ Using REMOTE Supabase (Project: jruxnkslobykshunucwa)`);
} else if (SUPABASE_URL.includes("localhost") || SUPABASE_URL.includes("127.0.0.1")) {
  console.log(`   ⚠️  Using LOCAL Supabase (localhost)`);
  console.log(`   ⚠️  WARNING: This will reset password in LOCAL Supabase, not production!`);
} else if (SUPABASE_URL.includes("supabase.co")) {
  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectId = match ? match[1] : "unknown";
  console.log(`   ✅ Using REMOTE Supabase (Project: ${projectId})`);
  if (projectId !== "jruxnkslobykshunucwa") {
    console.log(`   ⚠️  WARNING: Different project than expected (jruxnkslobykshunucwa)`);
  }
}

console.log(`   Email: ${email}`);
console.log(`   New Password: ${newPassword}\n`);

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set");
  console.error("\n   Please set it:");
  console.error("   export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key");
  console.error("   Or add to .env.local:\n");
  console.error("   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key");
  console.error("   NEXT_PUBLIC_SUPABASE_URL=https://jruxnkslobykshunucwa.supabase.co\n");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetPassword() {
  try {
    // 1. Find the user
    console.log("📋 Step 1: Finding user...\n");
    const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Error listing users:", listError.message);
      process.exit(1);
    }

    const authUser = authUsers?.users?.find((u) => u.email === email);
    
    if (!authUser) {
      console.error(`❌ User ${email} NOT found!`);
      console.error("\n   The user needs to be created first.");
      console.error("   Run: npx tsx scripts/create-platform-admin.ts\n");
      process.exit(1);
    }

    console.log(`✅ User found:`);
    console.log(`   - User ID: ${authUser.id}`);
    console.log(`   - Email: ${authUser.email}`);
    console.log(`   - Email Confirmed: ${authUser.email_confirmed_at ? "Yes" : "No"}\n`);

    // 2. Update password
    console.log("📋 Step 2: Resetting password...\n");
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      authUser.id,
      {
        password: newPassword,
      }
    );

    if (updateError) {
      console.error("❌ Error updating password:", updateError.message);
      process.exit(1);
    }

    console.log(`✅ Password reset successfully!\n`);

    // 3. Test login
    console.log("📋 Step 3: Testing login with new password...\n");
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
    
    if (!anonKey) {
      console.warn("⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY not set - skipping login test");
      console.warn("   Set it to test login credentials\n");
    } else {
      const regularClient = createClient(SUPABASE_URL, anonKey);
      
      const { data: loginData, error: loginError } = await regularClient.auth.signInWithPassword({
        email,
        password: newPassword,
      });

      if (loginError) {
        console.error(`❌ Login test FAILED:`);
        console.error(`   Error: ${loginError.message}\n`);
        console.error("   The password was reset, but login test failed.");
        console.error("   This might indicate an issue with the anon key or network.\n");
      } else {
        console.log(`✅ Login test SUCCESSFUL!`);
        console.log(`   - User ID: ${loginData.user.id}`);
        console.log(`   - Email: ${loginData.user.email}\n`);
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ PASSWORD RESET COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📧 Login Credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}\n`);
    console.log("💡 Next Steps:");
    console.log("   1. Try logging in at your Vercel deployment");
    console.log("   2. If still failing, verify Vercel environment variables:");
    console.log("      - NEXT_PUBLIC_SUPABASE_URL=https://jruxnkslobykshunucwa.supabase.co");
    console.log("      - NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key");
    console.log("   3. Redeploy Vercel if you updated environment variables\n");

  } catch (error: any) {
    console.error("❌ Unexpected error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

resetPassword().catch(console.error);

