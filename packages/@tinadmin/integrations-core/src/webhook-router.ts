import "server-only";

import crypto from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { WebhookReceiptInput } from "./types";

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Compute an idempotency key for a webhook event when the provider does not
 * supply one you can trust.
 */
export function computeIdempotencyKey(params: {
  providerSlug: string;
  eventType?: string | null;
  rawBody: string;
}): string {
  return sha256(
    JSON.stringify({
      provider: params.providerSlug,
      eventType: params.eventType ?? null,
      rawBodyHash: sha256(params.rawBody),
    })
  );
}

export async function ingestWebhookEvent(
  supabase: SupabaseClient<any>,
  input: WebhookReceiptInput
) {
  const { data, error } = await supabase
    .from("integration_webhook_events")
    .insert({
      provider_id: input.provider_id,
      tenant_id: input.tenant_id ?? null,
      connection_id: input.connection_id ?? null,
      idempotency_key: input.idempotency_key,
      event_type: input.event_type ?? null,
      headers: input.headers ?? {},
      payload: input.payload,
      status: "received",
    })
    .select("*")
    .single();

  // If uniqueness constraint hit, treat as idempotent success
  if (error && /duplicate key value|unique/i.test(error.message)) {
    return { idempotent: true as const };
  }
  if (error) throw error;

  return { idempotent: false as const, event: data };
}

