"use server";

import {
  getSupportTicketThreads,
  createSupportTicketThread,
  type CreateThreadInput,
} from "@tinadmin/core/support";
import { getCurrentTenant } from "@/core/multi-tenancy/server";

/**
 * Get all threads for a support ticket (portal)
 */
export async function getTicketThreads(
  ticketId: string,
  options?: { includeInternal?: boolean }
) {
  const tenantId = await getCurrentTenant();
  if (!tenantId) throw new Error("Tenant not found. Please sign in.");
  return await getSupportTicketThreads(ticketId, options, tenantId);
}

/**
 * Create a new thread/reply for a support ticket (portal; no email notification)
 */
export async function createTicketThread(
  ticketId: string,
  input: CreateThreadInput
) {
  const tenantId = await getCurrentTenant();
  if (!tenantId) throw new Error("Tenant not found. Please sign in.");
  return await createSupportTicketThread(ticketId, input, tenantId);
}
