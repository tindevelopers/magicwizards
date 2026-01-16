/**
 * TENANT DATA SOURCE
 * 
 * Provides tenant-specific data for chatbot context.
 */

import { createTenantAwareServerClient } from '../../database/tenant-client';

export interface TenantQuery {
  tenantId: string;
  type: 'settings' | 'users' | 'organizations';
  filters?: Record<string, unknown>;
}

/**
 * Query tenant data for chatbot context
 */
export async function queryTenantData(query: TenantQuery): Promise<unknown> {
  const tenantClient = await createTenantAwareServerClient(query.tenantId);
  const supabase = tenantClient.getClient();

  switch (query.type) {
    case 'settings': {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', query.tenantId)
        .single();

      if (error) {
        console.error('Error querying tenant settings:', error);
        return null;
      }

      return data;
    }

    case 'users': {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', query.tenantId)
        .limit(10);

      if (error) {
        console.error('Error querying users:', error);
        return [];
      }

      return data || [];
    }

    case 'organizations': {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('tenant_id', query.tenantId)
        .limit(10);

      if (error) {
        console.error('Error querying organizations:', error);
        return [];
      }

      return data || [];
    }

    default:
      throw new Error(`Unknown tenant type: ${query.type}`);
  }
}

/**
 * Format tenant data for chatbot context
 */
export function formatTenantDataForContext(
  data: unknown,
  type: TenantQuery['type']
): string {
  if (!data) {
    return `No ${type} found.`;
  }

  switch (type) {
    case 'settings': {
      const tenant = data as any;
      return `Tenant: ${tenant.name || 'N/A'} - Domain: ${tenant.domain || 'N/A'}`;
    }

    case 'users': {
      const users = data as any[];
      if (users.length === 0) {
        return 'No users found.';
      }
      return `Users:\n${users
        .map((user, i) => `${i + 1}. ${user.email || 'N/A'} - ${user.role || 'N/A'}`)
        .join('\n')}`;
    }

    case 'organizations': {
      const orgs = data as any[];
      if (orgs.length === 0) {
        return 'No organizations found.';
      }
      return `Organizations:\n${orgs
        .map((org, i) => `${i + 1}. ${org.name || 'N/A'}`)
        .join('\n')}`;
    }

    default:
      return JSON.stringify(data);
  }
}

