import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { IntegrationProviderSlug, PlatformProviderSettings, ProviderRecord } from "./types";

export async function getProviderBySlug(
  supabase: SupabaseClient<any>,
  slug: IntegrationProviderSlug
): Promise<ProviderRecord | null> {
  const { data, error } = await supabase
    .from("integration_providers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ProviderRecord | null;
}

export async function listProviders(
  supabase: SupabaseClient<any>
): Promise<ProviderRecord[]> {
  const { data, error } = await supabase
    .from("integration_providers")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ProviderRecord[];
}

export async function getPlatformProviderSettings(
  supabase: SupabaseClient<any>,
  providerId: string
): Promise<PlatformProviderSettings | null> {
  const { data, error } = await supabase
    .from("platform_integration_settings")
    .select("provider_id,enabled,settings")
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as PlatformProviderSettings | null;
}

export async function isProviderEnabledForPlatform(
  supabase: SupabaseClient<any>,
  providerId: string
): Promise<boolean> {
  const settings = await getPlatformProviderSettings(supabase, providerId);
  return settings?.enabled === true;
}

