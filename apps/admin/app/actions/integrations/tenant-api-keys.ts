"use server";

import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentUser } from "@/core/database/user-actions";
import { encryptSecrets } from "@tinadmin/integrations-core";

/** When encryption key is not set (dev), store plain JSON. */
function prepareSecretsForStorage(secrets: Record<string, string>): {
  ciphertext: string;
  iv: string;
  tag: string;
} {
  const hasKey = !!process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim();
  if (hasKey) {
    return encryptSecrets(secrets as Record<string, import("@tinadmin/integrations-core").Json>);
  }
  return {
    ciphertext: JSON.stringify(secrets),
    iv: "n/a",
    tag: "n/a",
  };
}

/**
 * Save or update a tenant-level API key connection.
 * Used for providers with auth_type=api_key (telnyx, vapi, twilio, web-search).
 */
export async function saveTenantApiKeyConnection(
  providerSlug: string,
  secrets: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) {
    return { ok: false, error: "Tenant context required" };
  }

  const admin = createAdminClient();

  const { data: provider, error: providerErr } = await (admin as any)
    .from("integration_providers")
    .select("id")
    .eq("slug", providerSlug)
    .single();

  if (providerErr || !provider) {
    return { ok: false, error: `Unknown provider: ${providerSlug}` };
  }

  const { data: platformSettings } = await (admin as any)
    .from("platform_integration_settings")
    .select("enabled")
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (platformSettings && !platformSettings.enabled) {
    return { ok: false, error: `${providerSlug} is disabled by platform owner` };
  }

  const { data: existing } = await (admin as any)
    .from("integration_connections")
    .select("id")
    .eq("tenant_id", user.tenant_id)
    .eq("provider_id", provider.id)
    .eq("scope", "tenant")
    .maybeSingle();

  const enc = prepareSecretsForStorage(secrets);

  if (existing) {
    await (admin as any)
      .from("integration_connections")
      .update({
        status: "connected",
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    await (admin as any)
      .from("integration_connection_secrets")
      .upsert(
        {
          connection_id: existing.id,
          secrets_ciphertext: enc.ciphertext,
          secrets_iv: enc.iv,
          secrets_tag: enc.tag,
        },
        { onConflict: "connection_id" },
      );
  } else {
    const { data: inserted, error: insertErr } = await (admin as any)
      .from("integration_connections")
      .insert({
        tenant_id: user.tenant_id,
        provider_id: provider.id,
        scope: "tenant",
        status: "connected",
        display_name: providerSlug,
        metadata: { provider: providerSlug },
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      return { ok: false, error: insertErr?.message ?? "Failed to create connection" };
    }

    await (admin as any)
      .from("integration_connection_secrets")
      .insert({
        connection_id: inserted.id,
        secrets_ciphertext: enc.ciphertext,
        secrets_iv: enc.iv,
        secrets_tag: enc.tag,
      });
  }

  return { ok: true };
}

/**
 * Disconnect a tenant-level API key connection.
 */
export async function disconnectTenantApiKeyConnection(
  providerSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user?.tenant_id) {
    return { ok: false, error: "Tenant context required" };
  }

  const admin = createAdminClient();

  const { data: provider } = await (admin as any)
    .from("integration_providers")
    .select("id")
    .eq("slug", providerSlug)
    .single();

  if (!provider) return { ok: false, error: `Unknown provider: ${providerSlug}` };

  await (admin as any)
    .from("integration_connections")
    .update({
      status: "disconnected",
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", user.tenant_id)
    .eq("provider_id", provider.id)
    .eq("scope", "tenant");

  return { ok: true };
}
