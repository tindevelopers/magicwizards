import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role key (bypasses RLS).
 * Server-only and MUST NOT be used in client bundles.
 */
export function createSupabaseAdminClient(): SupabaseClient<any> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createClient<any>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { apikey: serviceRoleKey } },
    db: { schema: "public" },
  });
}

