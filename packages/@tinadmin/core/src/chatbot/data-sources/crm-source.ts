/**
 * CRM DATA SOURCE
 * 
 * Provides CRM data (contacts, companies, deals, tasks) for chatbot context.
 */

import { createTenantAwareServerClient } from '../../database/tenant-client';

export interface CRMQuery {
  tenantId: string;
  type: 'contacts' | 'companies' | 'deals' | 'tasks';
  filters?: Record<string, unknown>;
  limit?: number;
}

/**
 * Query CRM data for chatbot context
 */
export async function queryCRMData(query: CRMQuery): Promise<unknown[]> {
  const tenantClient = await createTenantAwareServerClient(query.tenantId);
  const supabase = tenantClient.getClient();

  const tableMap: Record<string, string> = {
    contacts: 'contacts',
    companies: 'companies',
    deals: 'deals',
    tasks: 'tasks',
  };

  const tableName = tableMap[query.type];
  if (!tableName) {
    throw new Error(`Unknown CRM type: ${query.type}`);
  }

  let dbQuery = supabase
    .from(tableName)
    .select('*')
    .limit(query.limit || 10);

  // Apply filters
  if (query.filters) {
    for (const [key, value] of Object.entries(query.filters)) {
      dbQuery = dbQuery.eq(key, value as any);
    }
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error(`Error querying CRM ${query.type}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Format CRM data for chatbot context
 */
export function formatCRMDataForContext(
  data: unknown[],
  type: CRMQuery['type']
): string {
  if (data.length === 0) {
    return `No ${type} found.`;
  }

  const summaries = data.map((item: any, index: number) => {
    switch (type) {
      case 'contacts':
        return `${index + 1}. ${item.name || item.email} (${item.email})`;
      case 'companies':
        return `${index + 1}. ${item.name} (${item.industry || 'N/A'})`;
      case 'deals':
        return `${index + 1}. ${item.name} - ${item.stage || 'N/A'} - $${item.value || 0}`;
      case 'tasks':
        return `${index + 1}. ${item.title} - ${item.status || 'N/A'}`;
      default:
        return `${index + 1}. ${JSON.stringify(item)}`;
    }
  });

  return `Found ${data.length} ${type}:\n${summaries.join('\n')}`;
}

