import "server-only";

import { NextResponse } from "next/server";

import {
  createSignedState,
  getProviderAndPlatformSettings,
  requireTenantContext,
} from "@/app/api/integrations/_utils";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

export async function GET(request: Request) {
  let ctx: { userId: string; tenantId: string; returnTo: string };
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, tenantId, returnTo } = ctx;

  const { provider, platformSettings } = await getProviderAndPlatformSettings("google");
  if (!platformSettings?.enabled) {
    return NextResponse.json(
      { error: "Google Workspace is not enabled by the platform owner." },
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
    `${url.origin}/api/integrations/google/auth/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth is not configured (missing client id)." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
