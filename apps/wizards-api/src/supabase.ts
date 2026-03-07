import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appConfig } from "./config.js";

/** Admin client typed loosely so insert/update accept our table payloads without generated DB types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseAnyClient = SupabaseClient<any, "public", any>;

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
    ) as unknown as SupabaseAnyClient;
  }
  return cachedAdminClient;
}
