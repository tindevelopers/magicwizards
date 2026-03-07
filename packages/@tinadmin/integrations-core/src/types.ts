export type IntegrationProviderSlug =
  | "gohighlevel"
  | "assemblyai"
  | "recall"
  | "outstand"
  | (string & {});

export type IntegrationAuthType = "oauth2" | "api_key" | "webhook_only";

export type IntegrationConnectionStatus =
  | "disconnected"
  | "connected"
  | "pending"
  | "error";

export type IntegrationWebhookStatus = "received" | "processed" | "failed";

export type IntegrationJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "dead";

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export type ProviderCategory = string;

export interface ProviderRecord {
  id: string;
  slug: string;
  name: string;
  category: ProviderCategory;
  description: string | null;
  icon_slug: string | null;
  auth_type: IntegrationAuthType;
  is_beta: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformProviderSettings {
  provider_id: string;
  enabled: boolean;
  settings: Record<string, Json>;
}

export interface IntegrationConnectionRecord {
  id: string;
  provider_id: string;
  tenant_id: string;
  status: IntegrationConnectionStatus;
  display_name: string | null;
  scopes: string[];
  metadata: Record<string, Json>;
  last_sync_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionSecrets {
  [key: string]: Json;
}

export interface WebhookReceiptInput {
  provider_id: string;
  tenant_id?: string | null;
  connection_id?: string | null;
  idempotency_key: string;
  event_type?: string | null;
  headers?: Record<string, Json>;
  payload: Record<string, Json>;
}

export interface JobInput {
  provider_id: string;
  tenant_id?: string | null;
  connection_id?: string | null;
  job_type: string;
  payload?: Record<string, Json>;
  run_at?: string; // ISO
}

