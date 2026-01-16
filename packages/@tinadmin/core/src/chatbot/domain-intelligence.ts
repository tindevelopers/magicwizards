/**
 * DOMAIN INTELLIGENCE SERVICE
 * 
 * Understands platform domains and routes queries appropriately.
 */

import type { DomainContext } from './types';

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  auth: [
    'authentication', 'login', 'sign in', 'sign up', 'sign out', 'password',
    'session', 'user', 'oauth', 'sso', 'mfa', 'multi-factor', 'token',
    'jwt', 'refresh token', 'password reset', 'email verification',
  ],
  'multi-tenancy': [
    'tenant', 'multi-tenant', 'organization', 'workspace', 'subdomain',
    'tenant isolation', 'white-label', 'branding', 'tenant context',
    'tenant management', 'organization management',
  ],
  billing: [
    'billing', 'payment', 'subscription', 'stripe', 'invoice', 'plan',
    'pricing', 'checkout', 'payment method', 'card', 'usage', 'metering',
    'cancel subscription', 'upgrade', 'downgrade',
  ],
  permissions: [
    'permission', 'role', 'rbac', 'access control', 'authorization',
    'gate', 'check permission', 'has permission', 'require permission',
    'role-based', 'access', 'privilege',
  ],
  database: [
    'database', 'query', 'supabase', 'postgres', 'sql', 'rls', 'row level security',
    'data access', 'client', 'table', 'migration', 'schema',
  ],
  shared: [
    'utility', 'helper', 'common', 'shared', 'utils', 'validation',
    'error', 'api', 'crud',
  ],
};

/**
 * Detect domain from query text
 */
export function detectDomain(query: string): DomainContext {
  const lowerQuery = query.toLowerCase();
  const scores: Record<string, number> = {};

  // Score each domain based on keyword matches
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        score += 1;
      }
    }
    scores[domain] = score;
  }

  // Find domain with highest score
  const sortedDomains = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  const [topDomain, topScore] = sortedDomains[0] || ['general', 0];
  const totalKeywords = DOMAIN_KEYWORDS[topDomain]?.length || 1;
  const confidence = Math.min(topScore / totalKeywords, 1);

  return {
    domain: topDomain as DomainContext['domain'],
    confidence,
  };
}

/**
 * Get relevant knowledge base IDs for a domain
 */
export function getDomainKnowledgeBases(
  domain: DomainContext['domain'],
  tenantId: string
): string[] {
  // Platform knowledge bases are shared across tenants
  // Tenant-specific knowledge bases are scoped to tenant
  if (domain === 'general') {
    return []; // Will search all knowledge bases
  }

  // Return knowledge base IDs that match the domain
  // This will be used to filter searches
  return [`platform:${domain}`, `tenant:${tenantId}:${domain}`];
}

/**
 * Enhance query with domain context
 */
export function enhanceQueryWithDomain(
  query: string,
  domainContext: DomainContext
): string {
  if (domainContext.domain === 'general') {
    return query;
  }

  // Add domain context to improve retrieval
  return `[${domainContext.domain} domain] ${query}`;
}

/**
 * Get domain-specific system prompt additions
 */
export function getDomainPrompt(domain: DomainContext['domain']): string {
  const domainPrompts: Record<string, string> = {
    auth: 'Focus on authentication flows, user management, and security.',
    'multi-tenancy': 'Focus on tenant isolation, organization management, and multi-tenant architecture.',
    billing: 'Focus on subscriptions, payments, invoicing, and billing operations.',
    permissions: 'Focus on role-based access control, permissions, and authorization.',
    database: 'Focus on data access patterns, queries, and database operations.',
    shared: 'Focus on common utilities and shared functionality.',
    general: '',
  };

  return domainPrompts[domain] || '';
}

