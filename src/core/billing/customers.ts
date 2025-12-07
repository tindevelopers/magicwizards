"use server";

import { stripe } from "@/core/billing/config";
import { createAdminClient, createClient, type Database } from "@/core/database";

type StripeCustomer = Database["public"]["Tables"]["stripe_customers"]["Insert"];

/**
 * Create or retrieve a Stripe customer for a tenant
 */
export async function createOrRetrieveCustomer(tenantId: string): Promise<{
  success: boolean;
  customerId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get tenant information
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Check if customer already exists
    const { data: existingCustomer } = await adminClient
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .single();

    if (existingCustomer) {
      return { success: true, customerId: existingCustomer.stripe_customer_id };
    }

    // Get primary user for tenant (for email)
    const { data: primaryUser } = await adminClient
      .from("users")
      .select("email, full_name")
      .eq("tenant_id", tenantId)
      .eq("role_id", (await adminClient.from("roles").select("id").eq("name", "Organization Admin").single()).data?.id)
      .limit(1)
      .single();

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: primaryUser?.email || `tenant-${tenantId}@example.com`,
      name: primaryUser?.full_name || tenant.name,
      metadata: {
        tenant_id: tenantId,
        tenant_name: tenant.name,
        tenant_domain: tenant.domain,
      },
    });

    // Save customer to database
    const customerData: StripeCustomer = {
      tenant_id: tenantId,
      user_id: primaryUser ? (await adminClient.from("users").select("id").eq("email", primaryUser.email).single()).data?.id : null,
      stripe_customer_id: customer.id,
      email: customer.email || primaryUser?.email || "",
      name: customer.name || tenant.name,
      metadata: customer.metadata as any,
    };

    const { error: insertError } = await adminClient
      .from("stripe_customers")
      .insert(customerData);

    if (insertError) {
      // If insert fails, try to delete the Stripe customer
      await stripe.customers.del(customer.id).catch(() => {});
      return { success: false, error: insertError.message };
    }

    return { success: true, customerId: customer.id };
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create customer",
    };
  }
}

/**
 * Get Stripe customer for a tenant
 */
export async function getCustomer(tenantId: string): Promise<{
  success: boolean;
  customer?: any;
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();

    const { data: customer, error } = await adminClient
      .from("stripe_customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (error || !customer) {
      return { success: false, error: "Customer not found" };
    }

    // Fetch full customer details from Stripe
    const stripeCustomer = await stripe.customers.retrieve(customer.stripe_customer_id);

    return { success: true, customer: stripeCustomer };
  } catch (error) {
    console.error("Error retrieving Stripe customer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to retrieve customer",
    };
  }
}

/**
 * Update Stripe customer
 */
export async function updateCustomer(
  tenantId: string,
  updates: {
    email?: string;
    name?: string;
    phone?: string;
    address?: any;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    const { data: customer } = await adminClient
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .single();

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Update in Stripe
    await stripe.customers.update(customer.stripe_customer_id, {
      email: updates.email,
      name: updates.name,
      phone: updates.phone,
      address: updates.address,
    });

    // Update in database
    const { error } = await adminClient
      .from("stripe_customers")
      .update({
        email: updates.email,
        name: updates.name,
        phone: updates.phone,
        address: updates.address,
      })
      .eq("tenant_id", tenantId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating Stripe customer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update customer",
    };
  }
}

