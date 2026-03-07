import "server-only";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/core/database/admin-client";
import { getProviderAndPlatformSettings } from "@/app/api/integrations/_utils";
import { ingestWebhookEvent } from "@tinadmin/integrations-core";
import { getWebhookIdempotencyKey } from "@tinadmin/integration-gohighlevel";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const eventType = request.headers.get("x-ghl-event-type") ?? null;

  const { provider, platformSettings } = await getProviderAndPlatformSettings("gohighlevel");
  if (!platformSettings?.enabled) {
    return NextResponse.json({ error: "Provider disabled" }, { status: 403 });
  }

  const idempotencyKey =
    request.headers.get("x-idempotency-key") ??
    getWebhookIdempotencyKey({ rawBody, eventType });

  const headers: Record<string, any> = {};
  request.headers.forEach((value, key) => {
    // Avoid storing sensitive headers
    if (key.toLowerCase().includes("authorization")) return;
    headers[key] = value;
  });

  let payload: any = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = { raw: rawBody };
  }

  const admin = createAdminClient();
  const result = await ingestWebhookEvent(admin as any, {
    provider_id: provider.id,
    idempotency_key: idempotencyKey,
    event_type: eventType,
    headers,
    payload,
  });

  return NextResponse.json({ ok: true, ...result });
}

