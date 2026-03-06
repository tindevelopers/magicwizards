import "server-only";

import { NextResponse } from "next/server";

import {
  createSignedState,
  getProviderAndPlatformSettings,
  requireTenantContext,
} from "@/app/api/integrations/_utils";

const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const SCOPES = [
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Mail.ReadWrite",
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/User.Read",
  "offline_access",
].join(" ");

export async function GET(request: Request) {
  let ctx: { userId: string; tenantId: string; returnTo: string };
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, tenantId, returnTo } = ctx;

  const { provider, platformSettings } = await getProviderAndPlatformSettings("microsoft");
  if (!platformSettings?.enabled) {
    return NextResponse.json(
      { error: "Microsoft 365 is not enabled by the platform owner." },
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
    `${url.origin}/api/integrations/microsoft/auth/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "Microsoft OAuth is not configured (missing client id)." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
    response_mode: "query",
    prompt: "consent",
  });

  return NextResponse.redirect(`${MICROSOFT_AUTH_URL}?${params.toString()}`);
}
