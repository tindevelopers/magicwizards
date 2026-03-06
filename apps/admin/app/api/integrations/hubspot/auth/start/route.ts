import "server-only";

import { NextResponse } from "next/server";

import {
  createSignedState,
  getProviderAndPlatformSettings,
  requireTenantContext,
} from "@/app/api/integrations/_utils";

const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.companies.read",
  "crm.objects.companies.write",
  "crm.objects.deals.read",
  "crm.objects.deals.write",
].join(" ");

export async function GET(request: Request) {
  let ctx: { userId: string; tenantId: string; returnTo: string };
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, tenantId, returnTo } = ctx;

  const { provider, platformSettings } = await getProviderAndPlatformSettings("hubspot");
  if (!platformSettings?.enabled) {
    return NextResponse.json(
      { error: "HubSpot is not enabled by the platform owner." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const requestedReturnTo = url.searchParams.get("returnTo");
  const safeReturnTo =
    requestedReturnTo?.startsWith("/") || requestedReturnTo?.startsWith("http")
      ? requestedReturnTo
      : returnTo;

  const state = createSignedState({
    tenantId,
    userId,
    returnTo: safeReturnTo,
    nonce: crypto.randomUUID().slice(0, 8) + Date.now().toString(36),
  });

  const settings = (platformSettings.settings ?? {}) as Record<string, string>;
  const clientId = String(settings.oauthClientId ?? "").trim();
  const redirectUri =
    String(settings.oauthRedirectUri ?? "").trim() ||
    `${url.origin}/api/integrations/hubspot/auth/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "HubSpot OAuth is not configured (missing client id)." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });

  return NextResponse.redirect(`${HUBSPOT_AUTH_URL}?${params.toString()}`);
}
