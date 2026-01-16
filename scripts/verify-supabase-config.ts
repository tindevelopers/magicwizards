#!/usr/bin/env tsx
/**
 * Script to verify which Supabase URL is being used
 * This confirms whether signin will use remote or local Supabase
 */

console.log("\n🔍 Verifying Supabase Configuration\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

console.log("📊 Environment Variables:");
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl || "NOT SET"}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? "SET (hidden)" : "NOT SET"}\n`);

if (!supabaseUrl) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set!");
  console.error("\n   The signin will fail because it can't connect to Supabase.\n");
  process.exit(1);
}

// Determine which Supabase is configured
if (supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")) {
  console.log("⚠️  LOCAL Supabase Detected:");
  console.log(`   URL: ${supabaseUrl}`);
  console.log("   This is for LOCAL DEVELOPMENT only\n");
  console.log("   ⚠️  WARNING: Signin will use LOCAL Supabase!");
  console.log("   If you're testing on Vercel, this is WRONG.\n");
  console.log("   To use REMOTE Supabase:");
  console.log("   Set NEXT_PUBLIC_SUPABASE_URL=https://jruxnkslobykshunucwa.supabase.co\n");
} else if (supabaseUrl.includes("jruxnkslobykshunucwa")) {
  console.log("✅ REMOTE Supabase Detected:");
  console.log(`   URL: ${supabaseUrl}`);
  console.log("   Project ID: jruxnkslobykshunucwa");
  console.log("   This is the CORRECT production Supabase!\n");
  console.log("   ✅ Signin will use REMOTE Supabase (correct for Vercel)\n");
} else if (supabaseUrl.includes("supabase.co")) {
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectId = match ? match[1] : "unknown";
  console.log("✅ REMOTE Supabase Detected:");
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Project ID: ${projectId}\n`);
  if (projectId !== "jruxnkslobykshunucwa") {
    console.warn("   ⚠️  WARNING: This is a DIFFERENT Supabase project!");
    console.warn(`   Expected: jruxnkslobykshunucwa`);
    console.warn(`   Found: ${projectId}\n`);
    console.warn("   Signin will use this project, but user may not exist here.\n");
  } else {
    console.log("   ✅ Signin will use REMOTE Supabase (correct)\n");
  }
} else {
  console.log("❓ Unknown Supabase Configuration:");
  console.log(`   URL: ${supabaseUrl}\n`);
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("💡 How Signin Works:");
console.log("   1. signIn() calls createClient() from @/core/database/server");
console.log("   2. createClient() reads process.env.NEXT_PUBLIC_SUPABASE_URL");
console.log("   3. It uses that URL to connect to Supabase Auth\n");
console.log("   ✅ In Vercel: Uses NEXT_PUBLIC_SUPABASE_URL from Vercel env vars");
console.log("   ✅ Locally: Uses NEXT_PUBLIC_SUPABASE_URL from .env.local\n");
console.log("   To verify Vercel is using remote Supabase:");
console.log("   Check Vercel Dashboard → Settings → Environment Variables\n");

