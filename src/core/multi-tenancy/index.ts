/**
 * MULTI-TENANCY DOMAIN
 * 
 * Central multi-tenancy module for the SaaS platform.
 * Handles tenant isolation, context, routing, and white-labeling.
 * 
 * PUBLIC API - Only import from this file!
 */

// ============================================================================
// TYPES
// ============================================================================
export type {
  TenantContext,
  TenantResolutionSource,
  TenantValidationResult,
} from './types';

// ============================================================================
// TENANT CONTEXT
// ============================================================================
export {
  getTenantContext,
  setTenantContext,
  clearTenantContext,
} from './context';

// For React components
export {
  TenantProvider,
  useTenant,
} from './context';

// ============================================================================
// TENANT RESOLUTION (Server-side)
// ============================================================================
export {
  resolveTenantFromRequest,
  resolveTenantFromSubdomain,
  resolveTenantFromHeader,
  resolveTenantFromPath,
} from './resolver';

// ============================================================================
// TENANT VALIDATION
// ============================================================================
export {
  validateTenantAccess,
  validateTenantStatus,
} from './validation';

// ============================================================================
// SUBDOMAIN ROUTING
// ============================================================================
export {
  getSubdomainFromRequest,
  getTenantDomain,
  isTenantSubdomain,
} from './subdomain-routing';

// ============================================================================
// DATABASE QUERIES (Tenant-Aware)
// ============================================================================
export {
  createTenantQuery,
  applyTenantFilter,
  getTenantAwareClient,
} from './query-builder';

// ============================================================================
// SERVER UTILITIES
// ============================================================================
export {
  getCurrentTenantId,
  getCurrentTenant,
} from './server';

// ============================================================================
// ACTIONS (Server Actions)
// ============================================================================
export {
  createTenantAction,
  updateTenantAction,
  deleteTenantAction,
  getTenantAction,
  listTenantsAction,
} from './actions';

// ============================================================================
// TENANT ROLES
// ============================================================================
export {
  assignTenantRoleAction,
  removeTenantRoleAction,
} from './tenant-roles';

// ============================================================================
// WORKSPACES
// ============================================================================
export {
  createWorkspaceAction,
  getWorkspacesAction,
  updateWorkspaceAction,
  deleteWorkspaceAction,
} from './workspaces';

// ============================================================================
// WHITE-LABEL SETTINGS
// ============================================================================
export {
  getBrandingSettings,
  saveBrandingSettings,
  getThemeSettings,
  saveThemeSettings,
  getEmailSettings,
  saveEmailSettings,
  getCustomCSS,
  saveCustomCSS,
  getCustomDomains,
  saveCustomDomains,
} from './white-label';

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if the application is running in multi-tenant mode
 */
export function isMultiTenantEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MULTI_TENANT_ENABLED === 'true';
}

/**
 * Get the tenant resolution strategy from environment
 */
export function getTenantResolutionStrategy(): 'subdomain' | 'header' | 'path' | 'query' {
  return (process.env.NEXT_PUBLIC_TENANT_RESOLUTION as any) || 'subdomain';
}

/**
 * Check if a domain is a valid tenant subdomain
 */
export function isValidTenantDomain(domain: string): boolean {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  if (!baseDomain) return false;
  
  return domain.endsWith(`.${baseDomain}`) && domain !== baseDomain;
}

