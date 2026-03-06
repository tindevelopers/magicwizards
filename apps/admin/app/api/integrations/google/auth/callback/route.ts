import "server-only";

import { NextResponse } from "next/server";

import {
  parseSignedState,
  getProviderAndPlatformSettings,
} from "@/app/api/integrations/_utils";
import {
  createSupabaseAdminClient,
  encryptSecrets,
} from "@tinadmin/integrations-core";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function exchangeCodeForToken(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code: params.code,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${err}`);
  }

  return res.json();
}

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

  const { provider, platformSettings } = await getProviderAndPlatformSettings("google");
  if (!platformSettings?.enabled) {
    return NextResponse.json(
      { error: "Google Workspace is not enabled by the platform owner." },
      { status: 403 }
    );
  }

  const settings = (platformSettings.settings ?? {}) as Record<string, string>;
  const clientId = String(settings.oauthClientId ?? "").trim();
  const clientSecret = String(settings.oauthClientSecret ?? "").trim();
  const origin = url.origin;
  const redirectUri =
    String(settings.oauthRedirectUri ?? "").trim() ||
    `${origin}/api/integrations/google/auth/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google OAuth is not configured (missing client id/secret)." },
      { status: 500 }
    );
  }

  const tokenSet = await exchangeCodeForToken({
    clientId,
    clientSecret,
    redirectUri,
    code,
  });

  const expiresAt =
    tokenSet.expires_in != null
      ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString()
      : undefined;

  const supabase = createSupabaseAdminClient();

  const scopes = (tokenSet.scope ?? "").split(/\s+/).filter(Boolean);

  // User-level connection: find or create
  const { data: existing } = await supabase
    .from("integration_connections")
    .select("id")
    .eq("tenant_id", state.tenantId)
    .eq("provider_id", provider.id)
    .eq("user_id", state.userId)
    .maybeSingle();

  let connectionId: string;

  if (existing) {
    await supabase
      .from("integration_connections")
      .update({
        status: "connected",
        scopes,
        display_name: "Google Workspace",
        metadata: { provider: "google" },
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    connectionId = existing.id;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("integration_connections")
      .insert({
        tenant_id: state.tenantId,
        provider_id: provider.id,
        user_id: state.userId,
        scope: "user",
        status: "connected",
        scopes,
        display_name: "Google Workspace",
        metadata: { provider: "google" },
        created_by: state.userId,
      })
      .select("id")
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: `Failed to store connection: ${insertErr.message}` },
        { status: 500 }
      );
    }
    connectionId = inserted.id;
  }

  const oauth: Record<string, unknown> = {
    access_token: tokenSet.access_token,
    token_type: tokenSet.token_type ?? "Bearer",
  };
  if (tokenSet.refresh_token) oauth.refresh_token = tokenSet.refresh_token;
  if (expiresAt) oauth.expires_at = expiresAt;
  if (tokenSet.scope) oauth.scope = tokenSet.scope;

  const enc = encryptSecrets({ oauth } as Record<string, import("@tinadmin/integrations-core").Json>);
  await supabase.from("integration_connection_secrets").upsert(
    {
      connection_id: connectionId,
      secrets_ciphertext: enc.ciphertext,
      secrets_iv: enc.iv,
      secrets_tag: enc.tag,
    },
    { onConflict: "connection_id" }
  );

  const redirectTo =
    state.returnTo?.startsWith("http") || state.returnTo?.startsWith("https")
      ? state.returnTo
      : state.returnTo?.startsWith("/")
        ? `${origin}${state.returnTo}`
        : `${origin}/saas/integrations/list`;
  return NextResponse.redirect(redirectTo);
}
