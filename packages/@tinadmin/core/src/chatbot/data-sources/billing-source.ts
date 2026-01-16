/**
 * BILLING DATA SOURCE
 * 
 * Provides billing data (subscriptions, invoices, payment history) for chatbot context.
 */

import { createTenantAwareServerClient } from '../../database/tenant-client';

export interface BillingQuery {
  tenantId: string;
  type: 'subscription' | 'invoices' | 'payment-methods';
  filters?: Record<string, unknown>;
}

/**
 * Query billing data for chatbot context
 */
export async function queryBillingData(query: BillingQuery): Promise<unknown> {
  const tenantClient = await createTenantAwareServerClient(query.tenantId);
  const supabase = tenantClient.getClient();

  switch (query.type) {
    case 'subscription': {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', query.tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error querying subscription:', error);
        return null;
      }

      return data;
    }

    case 'invoices': {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', query.tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error querying invoices:', error);
        return [];
      }

      return data || [];
    }

    case 'payment-methods': {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('tenant_id', query.tenantId);

      if (error) {
        console.error('Error querying payment methods:', error);
        return [];
      }

      return data || [];
    }

    default:
      throw new Error(`Unknown billing type: ${query.type}`);
  }
}

/**
 * Format billing data for chatbot context
 */
export function formatBillingDataForContext(
  data: unknown,
  type: BillingQuery['type']
): string {
  if (!data) {
    return `No ${type} found.`;
  }

  switch (type) {
    case 'subscription': {
      const sub = data as any;
      return `Current subscription: ${sub.plan || 'N/A'} - Status: ${sub.status || 'N/A'}`;
    }

    case 'invoices': {
      const invoices = data as any[];
      if (invoices.length === 0) {
        return 'No invoices found.';
      }
      return `Recent invoices:\n${invoices
        .map((inv, i) => `${i + 1}. ${inv.amount || 0} - ${inv.status || 'N/A'} - ${inv.created_at || 'N/A'}`)
        .join('\n')}`;
    }

    case 'payment-methods': {
      const methods = data as any[];
      if (methods.length === 0) {
        return 'No payment methods found.';
      }
      return `Payment methods:\n${methods
        .map((pm, i) => `${i + 1}. ${pm.type || 'N/A'} - ${pm.last4 || 'N/A'}`)
        .join('\n')}`;
    }

    default:
      return JSON.stringify(data);
  }
}

