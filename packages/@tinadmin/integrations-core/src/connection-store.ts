import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptSecrets, encryptSecrets } from "./crypto";
import type { ConnectionSecrets, IntegrationConnectionRecord } from "./types";

export class ConnectionStore {
  constructor(private supabase: SupabaseClient<any>) {}

  async getTenantConnectionByProviderId(params: {
    tenantId: string;
    providerId: string;
  }): Promise<IntegrationConnectionRecord | null> {
    const { data, error } = await this.supabase
      .from("integration_connections")
      .select("*")
      .eq("tenant_id", params.tenantId)
      .eq("provider_id", params.providerId)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as IntegrationConnectionRecord | null;
  }

  async upsertTenantConnection(params: {
    tenantId: string;
    providerId: string;
    status: IntegrationConnectionRecord["status"];
    displayName?: string | null;
    scopes?: string[];
    metadata?: Record<string, any>;
    createdBy?: string | null;
    lastError?: string | null;
    lastSyncAt?: string | null;
  }): Promise<IntegrationConnectionRecord> {
    const { data, error } = await this.supabase
      .from("integration_connections")
      .upsert(
        {
          tenant_id: params.tenantId,
          provider_id: params.providerId,
          status: params.status,
          display_name: params.displayName ?? null,
          scopes: params.scopes ?? [],
          metadata: params.metadata ?? {},
          created_by: params.createdBy ?? null,
          last_error: params.lastError ?? null,
          last_sync_at: params.lastSyncAt ?? null,
        },
        { onConflict: "tenant_id,provider_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return data as unknown as IntegrationConnectionRecord;
  }

  async setConnectionSecrets(params: {
    connectionId: string;
    secrets: ConnectionSecrets;
  }): Promise<void> {
    const enc = encryptSecrets(params.secrets);
    const { error } = await this.supabase
      .from("integration_connection_secrets")
      .upsert(
        {
          connection_id: params.connectionId,
          secrets_ciphertext: enc.ciphertext,
          secrets_iv: enc.iv,
          secrets_tag: enc.tag,
        },
        { onConflict: "connection_id" }
      );

    if (error) throw error;
  }

  async getConnectionSecrets(params: {
    connectionId: string;
  }): Promise<ConnectionSecrets | null> {
    const { data, error } = await this.supabase
      .from("integration_connection_secrets")
      .select("secrets_ciphertext,secrets_iv,secrets_tag")
      .eq("connection_id", params.connectionId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return decryptSecrets({
      ciphertext: (data as any).secrets_ciphertext,
      iv: (data as any).secrets_iv,
      tag: (data as any).secrets_tag,
    });
  }
}

