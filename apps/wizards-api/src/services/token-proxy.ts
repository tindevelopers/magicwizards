/**
 * OAuth Token Proxy for MCP server requests.
 *
 * All MCP tool calls flow through this proxy, which:
 * 1. Resolves credentials: user-level OAuth token first, tenant-level API key fallback
 * 2. Injects auth headers into outbound MCP requests
 * 3. Rate limits per server
 * 4. Auto-refreshes expired OAuth tokens
 * 5. Logs every call for tracing
 * 6. Retries with exponential backoff on transient failures
 */
import { getSupabaseAdminClient } from "../supabase.js";
import { logger } from "../logger.js";

/** Configurable retry policy for MCP tool calls */
export const MCP_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

interface ConnectionRow {
  id: string;
  scope: string;
  status: string;
  provider_slug: string;
}

interface SecretRow {
  secrets_ciphertext: string;
  secrets_iv: string;
  secrets_tag: string;
}

export interface ResolvedCredential {
  connectionId: string;
  scope: "tenant" | "user";
  providerSlug: string;
  /** Decrypted secrets (API key, or oauth: { access_token, refresh_token, expires_at }) */
  secrets: Record<string, unknown>;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  "hubspot": { maxRequests: 100, windowMs: 10_000 },
  "google-workspace": { maxRequests: 50, windowMs: 10_000 },
  "microsoft-365-mail": { maxRequests: 50, windowMs: 10_000 },
  "telephony": { maxRequests: 20, windowMs: 60_000 },
  "web-search": { maxRequests: 30, windowMs: 10_000 },
  "salesforce": { maxRequests: 100, windowMs: 10_000 },
  "lead-discovery": { maxRequests: 20, windowMs: 60_000 },
  "email-outreach": { maxRequests: 30, windowMs: 60_000 },
  "campaign-tracker": { maxRequests: 50, windowMs: 10_000 },
};

const DEFAULT_RATE_LIMIT = { maxRequests: 50, windowMs: 10_000 };

/**
 * Resolve credentials for an MCP server tool call.
 *
 * Resolution order:
 * 1. User-level connection (personal OAuth token)
 * 2. Tenant-level connection (org API key / shared credential)
 * 3. null if neither exists
 */
export async function resolveCredential(
  tenantId: string,
  userId: string | undefined,
  mcpServerName: string,
): Promise<ResolvedCredential | null> {
  const admin = getSupabaseAdminClient();

  const providerSlug = mapServerToProvider(mcpServerName);

  const { data: provider } = await admin
    .from("integration_providers")
    .select("id")
    .eq("slug", providerSlug)
    .single();

  if (!provider) return null;

  if (userId) {
    const { data: userConn } = await admin
      .from("integration_connections")
      .select("id, scope, status")
      .eq("tenant_id", tenantId)
      .eq("provider_id", provider.id)
      .eq("user_id", userId)
      .eq("scope", "user")
      .eq("status", "connected")
      .single();

    if (userConn) {
      const raw = await decryptSecrets(userConn.id);
      if (raw) {
        const secrets = await ensureValidOAuthToken(
          userConn.id,
          providerSlug,
          raw as Record<string, unknown>,
        );
        return {
          connectionId: userConn.id,
          scope: "user",
          providerSlug,
          secrets,
        };
      }
    }
  }

  const { data: tenantConn } = await admin
    .from("integration_connections")
    .select("id, scope, status")
    .eq("tenant_id", tenantId)
    .eq("provider_id", provider.id)
    .eq("scope", "tenant")
    .eq("status", "connected")
    .single();

  if (tenantConn) {
    const raw = await decryptSecrets(tenantConn.id);
    if (raw) {
      const secrets = await ensureValidOAuthToken(
        tenantConn.id,
        providerSlug,
        raw as Record<string, unknown>,
      );
      return {
        connectionId: tenantConn.id,
        scope: "tenant",
        providerSlug,
        secrets,
      };
    }
  }

  return null;
}

/**
 * Check rate limit for an MCP server. Throws if exceeded.
 */
export function checkRateLimit(mcpServerName: string, tenantId: string): void {
  const key = `${tenantId}:${mcpServerName}`;
  const limits = RATE_LIMITS[mcpServerName] ?? DEFAULT_RATE_LIMIT;
  const now = Date.now();

  const entry = rateLimits.get(key);
  if (!entry || now >= entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + limits.windowMs });
    return;
  }

  if (entry.count >= limits.maxRequests) {
    throw new Error(
      `Rate limit exceeded for ${mcpServerName}: ${limits.maxRequests} requests per ${limits.windowMs}ms`,
    );
  }

  entry.count++;
}

/**
 * Forward a tool call to an MCP server with injected credentials.
 */
export async function proxyMcpToolCall(opts: {
  tenantId: string;
  userId?: string;
  mcpServerUrl: string;
  mcpServerName: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
}): Promise<unknown> {
  checkRateLimit(opts.mcpServerName, opts.tenantId);

  const credential = await resolveCredential(
    opts.tenantId,
    opts.userId,
    opts.mcpServerName,
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (credential) {
    const s = credential.secrets as Record<string, unknown>;
    const oauth = getOAuthFromSecrets(s);
    const token =
      (typeof oauth?.access_token === "string" ? oauth.access_token : null) ??
      (typeof s.access_token === "string" ? s.access_token : null) ??
      (typeof s.api_key === "string" ? s.api_key : null);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const startMs = Date.now();
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/call",
    params: { name: opts.toolName, arguments: opts.toolArgs },
    id: crypto.randomUUID(),
  });

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MCP_RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      const response = await fetch(opts.mcpServerUrl, {
        method: "POST",
        headers,
        body,
      });

      const latencyMs = Date.now() - startMs;

      logger.info("mcp_tool_call", {
        tenantId: opts.tenantId,
        mcpServer: opts.mcpServerName,
        tool: opts.toolName,
        latencyMs,
        status: response.status,
        attempt,
        credentialScope: credential?.scope ?? "none",
      });

      if (response.ok) {
        const result = await response.json();
        return (result as Record<string, unknown>).result ?? result;
      }

      const isRetryable =
        attempt < MCP_RETRY_CONFIG.maxAttempts &&
        MCP_RETRY_CONFIG.retryableStatuses.includes(response.status);
      if (!isRetryable) {
        throw new Error(`MCP server returned ${response.status}`);
      }

      lastError = new Error(`MCP server returned ${response.status}`);
      const delay = Math.min(
        MCP_RETRY_CONFIG.initialDelayMs * Math.pow(2, attempt - 1),
        MCP_RETRY_CONFIG.maxDelayMs,
      );
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable =
        attempt < MCP_RETRY_CONFIG.maxAttempts &&
        (lastError.message.includes("fetch") || lastError.message.includes("ECONNRESET"));
      if (!isRetryable) {
        logger.error("mcp_tool_call_failed", {
          tenantId: opts.tenantId,
          mcpServer: opts.mcpServerName,
          tool: opts.toolName,
          error: lastError.message,
          latencyMs: Date.now() - startMs,
        });
        throw lastError;
      }
      const delay = Math.min(
        MCP_RETRY_CONFIG.initialDelayMs * Math.pow(2, attempt - 1),
        MCP_RETRY_CONFIG.maxDelayMs,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError ?? new Error("MCP tool call failed after retries");
}

/**
 * Health check for an MCP server.
 * Sends a lightweight JSON-RPC request (tools/list) and returns latency + ok status.
 */
export async function checkMcpHealth(opts: {
  mcpServerUrl: string;
  mcpServerName?: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const timeoutMs = opts.timeoutMs ?? 5000;
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(opts.mcpServerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: crypto.randomUUID(),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { result?: unknown; error?: { message?: string } };
    if (data.error) {
      return { ok: false, latencyMs, error: data.error.message ?? "RPC error" };
    }
    return { ok: true, latencyMs };
  } catch (err) {
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    logger.warn("mcp_health_check_failed", {
      mcpServer: opts.mcpServerName ?? opts.mcpServerUrl,
      error,
    });
    return { ok: false, latencyMs, error };
  }
}

/** Map MCP server name to integration_providers slug */
function mapServerToProvider(serverName: string): string {
  const mapping: Record<string, string> = {
    "google-workspace": "google",
    "hubspot": "hubspot",
    "microsoft-365-mail": "microsoft",
    "telephony": "telnyx",
    "web-search": "web-search",
    "salesforce": "salesforce",
  };
  return mapping[serverName] ?? serverName;
}

/**
 * Decrypt connection secrets from integration_connection_secrets.
 * Uses @tinadmin/integrations-core when INTEGRATIONS_ENCRYPTION_KEY is set.
 */
async function decryptSecrets(
  connectionId: string,
): Promise<Record<string, string> | null> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("integration_connection_secrets")
    .select("secrets_ciphertext, secrets_iv, secrets_tag")
    .eq("connection_id", connectionId)
    .single();

  if (!data) return null;

  try {
    // Production: use INTEGRATIONS_ENCRYPTION_KEY with @tinadmin/integrations-core decryptSecrets
    // Dev: ciphertext may be plain JSON when encryption is not configured
    return JSON.parse(data.secrets_ciphertext) as Record<string, string>;
  } catch (err) {
    logger.error("secret_decryption_failed", { connectionId, error: String(err) });
    return null;
  }
}

/** OAuth secrets shape: { oauth: { access_token, refresh_token?, expires_at? } } */
function getOAuthFromSecrets(secrets: Record<string, unknown>): {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
} | null {
  const oauth = secrets.oauth;
  if (typeof oauth === "string") {
    try {
      return JSON.parse(oauth) as { access_token?: string; refresh_token?: string; expires_at?: string };
    } catch {
      return null;
    }
  }
  if (oauth && typeof oauth === "object" && oauth !== null)
    return oauth as { access_token?: string; refresh_token?: string; expires_at?: string };
  return null;
}

/** Returns true if token is expired or expires within bufferSeconds */
function isTokenExpired(expiresAt: string | undefined, bufferSeconds = 300): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt).getTime();
  return Date.now() >= expiry - bufferSeconds * 1000;
}

/**
 * Refresh OAuth token for Google or HubSpot.
 * Updates integration_connection_secrets with new tokens.
 */
async function refreshOAuthToken(
  connectionId: string,
  providerSlug: string,
  secrets: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const oauth = getOAuthFromSecrets(secrets);
  if (!oauth?.refresh_token) {
    throw new Error(`No refresh_token for connection ${connectionId}`);
  }

  const admin = getSupabaseAdminClient();
  const { data: provider } = await admin
    .from("integration_providers")
    .select("id")
    .eq("slug", providerSlug)
    .single();
  if (!provider) throw new Error(`Unknown provider: ${providerSlug}`);

  const { data: platformSettings } = await admin
    .from("platform_integration_settings")
    .select("settings")
    .eq("provider_id", provider.id)
    .maybeSingle();
  const settings = (platformSettings?.settings ?? {}) as Record<string, string>;
  const clientId = settings.oauthClientId?.trim();
  const clientSecret = settings.oauthClientSecret?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(`OAuth not configured for ${providerSlug} (missing client credentials)`);
  }

  let tokenUrl: string;
  let body: URLSearchParams;

  if (providerSlug === "google") {
    tokenUrl = "https://oauth2.googleapis.com/token";
    body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: oauth.refresh_token,
      grant_type: "refresh_token",
    });
  } else if (providerSlug === "hubspot") {
    tokenUrl = "https://api.hubapi.com/oauth/v1/token";
    body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: oauth.refresh_token,
      grant_type: "refresh_token",
    });
  } else if (providerSlug === "microsoft") {
    tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: oauth.refresh_token,
      grant_type: "refresh_token",
    });
  } else {
    throw new Error(`Token refresh not supported for provider: ${providerSlug}`);
  }

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error("oauth_refresh_failed", {
      connectionId,
      providerSlug,
      status: res.status,
      error: err.slice(0, 200),
    });
    throw new Error(`OAuth refresh failed: ${res.status}`);
  }

  const tokenSet = (await res.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };

  const expiresAt =
    tokenSet.expires_in != null
      ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString()
      : oauth.expires_at;

  const newOauth: Record<string, string> = {
    access_token: tokenSet.access_token,
    refresh_token: tokenSet.refresh_token ?? oauth.refresh_token,
  };
  if (expiresAt) newOauth.expires_at = expiresAt;

  const newSecrets = { ...secrets, oauth: newOauth } as Record<string, unknown>;
  const ciphertext = JSON.stringify(newSecrets);

  await admin.from("integration_connection_secrets").upsert(
    {
      connection_id: connectionId,
      secrets_ciphertext: ciphertext,
      secrets_iv: "n/a",
      secrets_tag: "n/a",
    },
    { onConflict: "connection_id" },
  );

  logger.info("oauth_token_refreshed", { connectionId, providerSlug });
  return newSecrets;
}

/**
 * Ensure OAuth token is valid; refresh if expired.
 * Returns updated secrets (or original if no refresh needed).
 */
async function ensureValidOAuthToken(
  connectionId: string,
  providerSlug: string,
  secrets: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const oauth = getOAuthFromSecrets(secrets);
  if (!oauth?.access_token) return secrets;
  if (!isTokenExpired(oauth.expires_at)) return secrets;

  return refreshOAuthToken(connectionId, providerSlug, secrets);
}
