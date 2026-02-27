import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appConfig } from "./config.js";

export type SupabaseAnyClient = SupabaseClient<Record<string, never>, "public", Record<string, never>>;

let cachedAdminClient: SupabaseAnyClient | null = null;

export function getSupabaseAdminClient(): SupabaseAnyClient {
  if (!cachedAdminClient) {
    cachedAdminClient = createClient(
      appConfig.supabase.url,
      appConfig.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    ) as SupabaseAnyClient;
  }
  return cachedAdminClient;
}
