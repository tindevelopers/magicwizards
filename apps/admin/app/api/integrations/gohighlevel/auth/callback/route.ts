import "server-only";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/core/database/admin-client";
import { parseSignedState, getProviderAndPlatformSettings } from "@/app/api/integrations/_utils";
import { ConnectionStore, createSupabaseAdminClient } from "@tinadmin/integrations-core";
import { exchangeCodeForToken } from "@tinadmin/integration-gohighlevel";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  if (!code || !stateParam) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 }
    );
  }

  const state = parseSignedState(stateParam);

  const { provider, platformSettings } = await getProviderAndPlatformSettings("gohighlevel");
  if (!platformSettings?.enabled) {
    return NextResponse.json(
      { error: "GoHighLevel is not enabled by the platform owner." },
      { status: 403 }
    );
  }

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

  const tokenSet = await exchangeCodeForToken({
    config: { clientId, clientSecret, redirectUri, scopes },
    code,
  });

  const expiresAt =
    tokenSet.expires_in != null
      ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString()
      : undefined;

  const admin = createAdminClient();
  const store = new ConnectionStore(createSupabaseAdminClient());

  // Upsert connection status
  const connection = await store.upsertTenantConnection({
    tenantId: state.tenantId,
    providerId: provider.id,
    status: "connected",
    scopes,
    createdBy: state.userId,
    metadata: {
      provider: "gohighlevel",
    },
    lastError: null,
  });

  const oauth: Record<string, any> = { access_token: tokenSet.access_token };
  if (tokenSet.refresh_token) oauth.refresh_token = tokenSet.refresh_token;
  if (tokenSet.token_type) oauth.token_type = tokenSet.token_type;
  if (expiresAt) oauth.expires_at = expiresAt;
  if (tokenSet.scope) oauth.scope = tokenSet.scope;

  const secrets: Record<string, any> = { oauth };
  if ((tokenSet as any).locationId) secrets.location_id = (tokenSet as any).locationId;
  if ((tokenSet as any).companyId) secrets.company_id = (tokenSet as any).companyId;

  await store.setConnectionSecrets({
    connectionId: connection.id,
    secrets: secrets as any,
  });

  // Also mirror key metadata for display
  await (admin as any)
    .from("integration_connections")
    .update({
      display_name: "GoHighLevel",
      metadata: {
        ...(connection.metadata ?? {}),
        location_id: (tokenSet as any).locationId ?? null,
        company_id: (tokenSet as any).companyId ?? null,
      },
      status: "connected",
      last_error: null,
    })
    .eq("id", connection.id);

  const redirectTo = state.returnTo?.startsWith("/") ? state.returnTo : "/saas/integrations/list";
  return NextResponse.redirect(`${origin}${redirectTo}`);
}

