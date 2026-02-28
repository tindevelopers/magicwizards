/**
 * Create systemadmin@tin.info (Platform Admin) and gene@tin.info (tenant user) in Supabase.
 * Run from repo root: pnpm exec tsx scripts/create-tin-users.ts
 *
 * Requires: .env or .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, "../.env.local"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../apps/portal/.env.local"),
    path.resolve(__dirname, "../apps/admin/.env.local"),
  ];
  for (const p of envPaths) {
    dotenv.config({ path: p });
  }
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or .env.local");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type AdminClient = ReturnType<typeof getAdminClient>;

async function ensureTenant(adminClient: AdminClient) {
  const { data: existing } = await adminClient
    .from("tenants")
    .select("id, name, domain")
    .eq("domain", "tin.info")
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: created, error } = await adminClient
    .from("tenants")
    .insert({
      name: "TIN",
      domain: "tin.info",
      status: "active",
      plan: "starter",
      region: "us",
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create tenant: ${error?.message ?? "unknown"}`);
  }
  console.log("Created tenant TIN (tin.info):", created.id);
  return created.id;
}

async function createOrUpdateUser(
  adminClient: AdminClient,
  email: string,
  password: string,
  fullName: string,
  roleName: string,
  tenantId: string | null
) {
  const { data: roleData, error: roleError } = await adminClient
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !roleData) {
    const msg = roleError?.message ?? "";
    if (msg.includes("schema cache") || msg.includes("could not find"))
      throw new Error(
        `Role "${roleName}" not found: ${msg}. Ensure Supabase migrations have been applied (e.g. run: supabase db push or apply migrations in the Dashboard).`
      );
    throw new Error(`Role "${roleName}" not found: ${msg}`);
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    if (authError.message?.includes("already exists") || authError.message?.includes("already registered")) {
      const { data: list } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find((u) => u.email === email);
      if (!existing) throw new Error(`User ${email} exists in Auth but could not be retrieved`);
      const uid = existing.id;
      const { error: updateError } = await adminClient.auth.admin.updateUserById(uid, { password });
      if (updateError) console.warn("Could not update password for existing user:", updateError.message);
      const { data: userRow } = await adminClient
        .from("users")
        .upsert({
          id: uid,
          email,
          full_name: fullName,
          tenant_id: tenantId,
          role_id: roleData.id,
          plan: tenantId ? "starter" : "enterprise",
          status: "active",
        }, { onConflict: "id" })
        .select()
        .single();
      return userRow;
    }
    throw authError;
  }

  const { data: userRow, error: userError } = await adminClient
    .from("users")
    .insert({
      id: authData.user!.id,
      email,
      full_name: fullName,
      tenant_id: tenantId,
      role_id: roleData.id,
      plan: tenantId ? "starter" : "enterprise",
      status: "active",
    })
    .select()
    .single();

  if (userError) {
    if (userError.code === "23505") {
      const { data: updated } = await adminClient
        .from("users")
        .update({
          full_name: fullName,
          tenant_id: tenantId,
          role_id: roleData.id,
          status: "active",
        })
        .eq("id", authData.user!.id)
        .select()
        .single();
      return updated;
    }
    throw userError;
  }

  return userRow;
}

async function main() {
  loadEnv();

  const adminClient = getAdminClient();

  console.log("\n1. Creating systemadmin@tin.info (Platform Admin)...\n");
  await createOrUpdateUser(
    adminClient,
    "systemadmin@tin.info",
    "88888888",
    "System Admin",
    "Platform Admin",
    null
  );
  console.log("   Email: systemadmin@tin.info");
  console.log("   Password: 88888888");
  console.log("   Role: Platform Admin (tenant_id = null)\n");

  console.log("2. Ensuring tenant for gene@tin.info...\n");
  const tenantId = await ensureTenant(adminClient);

  console.log("3. Creating gene@tin.info (tenant user)...\n");
  await createOrUpdateUser(
    adminClient,
    "gene@tin.info",
    "88888888",
    "Gene",
    "Organization Admin",
    tenantId
  );
  console.log("   Email: gene@tin.info");
  console.log("   Password: 88888888");
  console.log("   Role: Organization Admin");
  console.log("   Tenant: TIN (tin.info)\n");

  console.log("Done. Both users can sign in with password 88888888.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
