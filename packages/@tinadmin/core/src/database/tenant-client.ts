import "server-only";

/**
 * Tenant-Aware Supabase Client Wrapper
 *
 * Provides a wrapper around Supabase clients that automatically
 * includes tenant context in queries
 */

import { createClient } from "./client";
import { createClient as createServerClient } from "./server";
import { createAdminClient } from "./admin-client";
import { buildTenantQuery, buildTenantScopedQuery } from "../multi-tenancy/query-builder";
import { ensureTenantId } from "../multi-tenancy/validation";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

type TableName = keyof Database["public"]["Tables"];

/**
 * Create a tenant-aware client wrapper
 * Automatically filters queries by tenant_id unless user is Platform Admin
 */
export class TenantAwareClient {
  private client: SupabaseClient<Database>;
  private tenantId: string | null | undefined;

  constructor(
    client: SupabaseClient<Database>,
    tenantId?: string | null
  ) {
    this.client = client;
    this.tenantId = tenantId;
  }

  /**
   * Get tenant-scoped query builder (synchronous, like SupabaseClient)
   * Note: Use getSupabaseClient() for proper type inference in support files
   */
  from<T extends TableName>(table: T): any {
    // Return a query builder that will filter by tenant_id when executed
    // This matches the SupabaseClient interface
    let query = this.client.from(table);
    
    // Apply tenant filter if tenantId is set
    if (this.tenantId) {
      query = (query as any).eq("tenant_id", this.tenantId);
    }
    
    return query;
  }

  /**
   * Get tenant-scoped query with select
   */
  async select<T extends TableName>(
    table: T,
    select: string,
    options?: { tenantId?: string | null; includePlatformAdmins?: boolean }
  ) {
    const effectiveTenantId = options?.tenantId ?? this.tenantId;
    return buildTenantScopedQuery(this.client, table, select, {
      tenantId: effectiveTenantId,
      includePlatformAdmins: options?.includePlatformAdmins,
    });
  }

  /**
   * Get the underlying Supabase client
   */
  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  /**
   * Access auth methods (delegates to underlying client)
   */
  get auth(): any {
    return this.client.auth;
  }

  /**
   * Access storage methods (delegates to underlying client)
   */
  get storage(): any {
    return this.client.storage;
  }

  /**
   * Set tenant ID for this client instance
   */
  setTenantId(tenantId: string | null) {
    this.tenantId = tenantId;
  }

  /**
   * Get current tenant ID
   */
  getTenantId(): string | null | undefined {
    return this.tenantId;
  }
}

/**
 * Create tenant-aware client for browser usage
 */
export async function createTenantAwareClient(
  tenantId?: string | null
): Promise<TenantAwareClient> {
  const client = createClient();
  const effectiveTenantId = tenantId || (await ensureTenantId().catch(() => null));
  return new TenantAwareClient(client, effectiveTenantId);
}

/**
 * Create tenant-aware client for server usage
 */
export async function createTenantAwareServerClient(
  tenantId?: string | null
): Promise<TenantAwareClient> {
  const client = await createServerClient();
  const effectiveTenantId = tenantId || (await ensureTenantId().catch(() => null));
  return new TenantAwareClient(client, effectiveTenantId);
}

/**
 * Create tenant-aware admin client (bypasses RLS)
 */
export function createTenantAwareAdminClient(
  tenantId?: string | null
): TenantAwareClient {
  const client = createAdminClient();
  return new TenantAwareClient(client, tenantId);
}

/**
 * Helper to get SupabaseClient from either TenantAwareClient or SupabaseClient
 * This resolves TypeScript union type issues
 */
export function getSupabaseClient(
  client: TenantAwareClient | SupabaseClient<Database>
): SupabaseClient<Database> {
  if (client instanceof TenantAwareClient) {
    return client.getClient();
  }
  return client;
}
