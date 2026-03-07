import "server-only";

import { computeIdempotencyKey } from "@tinadmin/integrations-core";

/**
 * GoHighLevel webhook verification varies by app configuration.
 * For now, we ingest webhooks idempotently and rely on platform-level secrets
 * (set by System Admin) to add signature verification later.
 */
export function getWebhookIdempotencyKey(params: {
  rawBody: string;
  eventType?: string | null;
}) {
  return computeIdempotencyKey({
    providerSlug: "gohighlevel",
    eventType: params.eventType ?? null,
    rawBody: params.rawBody,
  });
}

