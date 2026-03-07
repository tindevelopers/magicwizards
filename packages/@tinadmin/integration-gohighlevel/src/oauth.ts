import "server-only";

import type { GHLOAuthConfig, GHLTokenSet } from "./types";

const GHL_OAUTH_AUTHORIZE_URL = "https://marketplace.gohighlevel.com/oauth/chooselocation";
const GHL_OAUTH_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";

export function buildAuthorizationUrl(params: {
  config: GHLOAuthConfig;
  state: string;
}): string {
  const url = new URL(GHL_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", params.config.clientId);
  url.searchParams.set("redirect_uri", params.config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.config.scopes.join(" "));
  url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeCodeForToken(params: {
  config: GHLOAuthConfig;
  code: string;
}): Promise<GHLTokenSet> {
  const body = new URLSearchParams();
  body.set("client_id", params.config.clientId);
  body.set("client_secret", params.config.clientSecret);
  body.set("grant_type", "authorization_code");
  body.set("code", params.code);
  body.set("redirect_uri", params.config.redirectUri);

  const res = await fetch(GHL_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(
      `GoHighLevel token exchange failed (${res.status}): ${
        json?.message ?? JSON.stringify(json)
      }`
    );
  }

  return json as GHLTokenSet;
}

export async function refreshAccessToken(params: {
  config: GHLOAuthConfig;
  refreshToken: string;
}): Promise<GHLTokenSet> {
  const body = new URLSearchParams();
  body.set("client_id", params.config.clientId);
  body.set("client_secret", params.config.clientSecret);
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", params.refreshToken);

  const res = await fetch(GHL_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(
      `GoHighLevel token refresh failed (${res.status}): ${
        json?.message ?? JSON.stringify(json)
      }`
    );
  }

  return json as GHLTokenSet;
}

