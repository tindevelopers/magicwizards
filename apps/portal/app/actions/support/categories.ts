"use server";

import { getSupportCategories } from "@tinadmin/core/support";
import { getCurrentTenant } from "@/core/multi-tenancy/server";

/**
 * Get all support categories for the current tenant (portal)
 */
export async function getAllSupportCategories() {
  const tenantId = await getCurrentTenant();
  if (!tenantId) throw new Error("Tenant not found. Please sign in.");
  return await getSupportCategories(tenantId);
}
