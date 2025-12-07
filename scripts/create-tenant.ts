/**
 * Script to create a tenant
 * Usage: npx tsx scripts/create-tenant.ts <name> <domain> [plan]
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin-client";

async function createTenant(name: string, domain: string, plan: string = "starter") {
  const adminClient = createAdminClient();

  console.log(`\n🔍 Creating tenant...`);

  const { data: tenant, error } = await adminClient
    .from("tenants")
    .insert({
      name,
      domain,
      plan,
      status: "active",
      region: "us-east-1",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      console.error(`❌ Tenant with domain "${domain}" already exists`);
      // Try to get existing tenant
      const { data: existing } = await adminClient
        .from("tenants")
        .select("*")
        .eq("domain", domain)
        .single();
      
      if (existing) {
        console.log(`\n✅ Found existing tenant:`);
        console.log(`   ID: ${existing.id}`);
        console.log(`   Name: ${existing.name}`);
        console.log(`   Domain: ${existing.domain}`);
        return existing;
      }
    }
    throw error;
  }

  console.log(`\n✅ Tenant created successfully!`);
  console.log(`\n📋 Tenant details:`);
  console.log(`   ID: ${tenant.id}`);
  console.log(`   Name: ${tenant.name}`);
  console.log(`   Domain: ${tenant.domain}`);
  console.log(`   Plan: ${tenant.plan}`);
  console.log(`   Status: ${tenant.status}`);

  return tenant;
}

// Get command line arguments
const name = process.argv[2];
const domain = process.argv[3];
const plan = process.argv[4] || "starter";

if (!name || !domain) {
  console.error("Usage: npx tsx scripts/create-tenant.ts <name> <domain> [plan]");
  console.error("\nExample:");
  console.error('  npx tsx scripts/create-tenant.ts "SaaS Incorporated" saas-base enterprise');
  process.exit(1);
}

createTenant(name, domain, plan).catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});

