import "server-only";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/core/database/admin-client";
import { createSignedState, getProviderAndPlatformSettings, requireTenantContext } from "@/app/api/integrations/_utils";
import { buildAuthorizationUrl } from "@tinadmin/integration-gohighlevel";

export async function GET(request: Request) {
  let ctx: { userId: string; tenantId: string; returnTo: string };
  try {
    ctx = await requireTenantContext();
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, tenantId, returnTo } = ctx;

  const { provider, platformSettings } = await getProviderAndPlatformSettings("gohighlevel");
  if (!platformSettings?.enabled) {
    return NextResponse.json(
      { error: "GoHighLevel is not enabled by the platform owner." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const requestedReturnTo = url.searchParams.get("returnTo");
  const safeReturnTo = requestedReturnTo?.startsWith("/") ? requestedReturnTo : returnTo;

  const state = createSignedState({
    tenantId,
    userId,
    returnTo: safeReturnTo,
    nonce: cryptoRandomId(),
  });

  // Resolve OAuth config from platform settings
  const settings = (platformSettings.settings ?? {}) as any;
  const clientId = String(settings.oauthClientId ?? "").trim();
  const clientSecret = String(settings.oauthClientSecret ?? "").trim();
  const scopesRaw = String(settings.oauthScopes ?? "contacts.read").trim();
  const scopes = scopesRaw.split(/[,\s]+/).filter(Boolean);

  const origin = url.origin;
  const redirectUri =
    String(settings.oauthRedirectUri ?? "").trim() ||
    `${origin}/api/integrations/gohighlevel/auth/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "GoHighLevel OAuth is not configured (missing client id/secret)." },
      { status: 500 }
    );
  }

  // Store a pending connection row (optional but helpful for UX)
  const admin = createAdminClient();
  await (admin as any)
    .from("integration_connections")
    .upsert(
      {
        tenant_id: tenantId,
        provider_id: provider.id,
        status: "pending",
        metadata: {},
        scopes,
        created_by: userId,
      },
      { onConflict: "tenant_id,provider_id" }
    );

  const authUrl = buildAuthorizationUrl({
    config: { clientId, clientSecret, redirectUri, scopes },
    state,
  });

  return NextResponse.redirect(authUrl);
}

function cryptoRandomId() {
  // URL-safe random string
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

