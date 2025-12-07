/**
 * DATABASE DOMAIN
 * 
 * Central database module for the SaaS platform.
 * Provides database clients, types, and data access utilities.
 * 
 * PUBLIC API - Only import from this file!
 */

// ============================================================================
// TYPES
// ============================================================================
export type { Database } from './types';

// ============================================================================
// CLIENTS
// ============================================================================

/**
 * Server-side Supabase client (SSR-aware)
 * Use this in Server Components, Server Actions, and API Routes
 */
export { createClient, createServerClient } from './server';

/**
 * Client-side Supabase client (Browser)
 * Use this in Client Components
 */
export { createClient as createBrowserClient } from './client';

/**
 * Admin Supabase client (Bypasses RLS)
 * Use this ONLY in server-side admin operations
 * NEVER expose to the client!
 */
export { createAdminClient } from './admin-client';

/**
 * Tenant-aware Supabase client
 * Automatically applies tenant context
 */
export { createTenantClient } from './tenant-client';

// ============================================================================
// USER MANAGEMENT
// ============================================================================
export {
  getUser,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  getUsersForTenant,
} from './users';

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================
export {
  getTenant,
  getTenantByDomain,
  createTenant,
  updateTenant,
  deleteTenant,
  listTenants,
} from './tenants';

// ============================================================================
// ROLE MANAGEMENT
// ============================================================================
export {
  getRole,
  getRoleByName,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from './roles';

// ============================================================================
// WORKSPACE MANAGEMENT
// ============================================================================
export {
  getWorkspace,
  listWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from './workspaces';

// ============================================================================
// USER-TENANT ROLES (Multi-Role System)
// ============================================================================
export {
  assignTenantRole,
  removeTenantRole,
  getUserTenantRoles,
  getEffectiveRole,
} from './user-tenant-roles';

// ============================================================================
// ORGANIZATION ADMINS
// ============================================================================
export {
  getOrganizationAdmins,
  addOrganizationAdmin,
  removeOrganizationAdmin,
} from './organization-admins';

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get the current database provider type
 */
export function getDatabaseProvider(): 'supabase' | 'postgres' | 'mysql' {
  return (process.env.NEXT_PUBLIC_DATABASE_PROVIDER as any) || 'supabase';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get database connection info (for debugging)
 */
export function getDatabaseInfo(): {
  provider: string;
  url: string;
  environment: string;
} {
  return {
    provider: getDatabaseProvider(),
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured',
    environment: process.env.NODE_ENV || 'unknown',
  };
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    const client = await createClient();
    
    // Simple query to test connection
    const { error } = await client.from('roles').select('id').limit(1);
    
    if (error) {
      return { healthy: false, error: error.message };
    }
    
    const latency = Date.now() - start;
    return { healthy: true, latency };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

