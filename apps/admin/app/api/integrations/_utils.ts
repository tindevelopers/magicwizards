import "server-only";

import crypto from "node:crypto";

import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentUser } from "@/core/database/user-actions";

type SignedState = {
  tenantId: string;
  userId: string;
  returnTo: string;
  nonce: string;
  issuedAt: number;
};

function getStateSecret(): string {
  const secret = process.env.INTEGRATIONS_STATE_SECRET?.trim();
  if (!secret) {
    throw new Error("INTEGRATIONS_STATE_SECRET is not set");
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function unbase64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export function createSignedState(state: Omit<SignedState, "issuedAt">): string {
  const payload: SignedState = { ...state, issuedAt: Date.now() };
  const payloadB64 = base64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", getStateSecret())
    .update(payloadB64)
    .digest();
  return `${payloadB64}.${base64url(sig)}`;
}

export function parseSignedState(state: string): SignedState {
  const [payloadB64, sigB64] = state.split(".");
  if (!payloadB64 || !sigB64) throw new Error("Invalid state format");

  const expectedSig = crypto
    .createHmac("sha256", getStateSecret())
    .update(payloadB64)
    .digest();
  const actualSig = unbase64url(sigB64);
  if (
    expectedSig.length !== actualSig.length ||
    !crypto.timingSafeEqual(expectedSig, actualSig)
  ) {
    throw new Error("Invalid state signature");
  }

  const payload = JSON.parse(unbase64url(payloadB64).toString("utf8")) as SignedState;
  return payload;
}

export async function requireTenantContext(): Promise<{
  userId: string;
  tenantId: string;
  returnTo: string;
}> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!user.tenant_id) throw new Error("Tenant context required (tenant_id is null).");

  return {
    userId: user.id,
    tenantId: user.tenant_id,
    returnTo: "/saas/integrations/list",
  };
}

export async function getProviderAndPlatformSettings(slug: string) {
  const admin = createAdminClient();

  const { data: provider, error: providerError } = await (admin as any)
    .from("integration_providers")
    .select("*")
    .eq("slug", slug)
    .single();
  if (providerError) throw providerError;

  const { data: platformSettings, error: settingsError } = await (admin as any)
    .from("platform_integration_settings")
    .select("*")
    .eq("provider_id", provider.id)
    .maybeSingle();
  if (settingsError) throw settingsError;

  return {
    provider,
    platformSettings,
  };
}

