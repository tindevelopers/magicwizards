#!/usr/bin/env tsx
/**
 * Script to extract Supabase Project ID from URL
 * Run with: npx tsx scripts/get-supabase-project-id.ts <supabase-url>
 */

const url = process.argv[2] || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

if (!url) {
  console.error("❌ No Supabase URL provided");
  console.error("\nUsage:");
  console.error("  npx tsx scripts/get-supabase-project-id.ts <supabase-url>");
  console.error("\nOr set environment variable:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co");
  process.exit(1);
}

// Extract project ID from Supabase URL
// Format: https://<project-id>.supabase.co
let projectId = "local";

if (url.includes("supabase.co")) {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    projectId = match[1];
  }
} else if (url.includes("localhost") || url.includes("127.0.0.1")) {
  projectId = "local";
} else {
  // Try to extract from any URL pattern
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    if (hostname.includes("supabase")) {
      const parts = hostname.split(".");
      if (parts.length > 0) {
        projectId = parts[0];
      }
    }
  } catch (e) {
    // Invalid URL
  }
}

console.log("\n📊 Supabase Project Information:");
console.log(`   URL: ${url}`);
console.log(`   Project ID: ${projectId}\n`);

if (projectId === "local") {
  console.log("ℹ️  This appears to be a local Supabase instance.");
  console.log("   For production, the URL should be: https://<project-id>.supabase.co\n");
}

