"use server";

import {
  getSupportTickets,
  getSupportTicketById,
  createSupportTicket,
  type CreateTicketInput,
  type TicketStatus,
  type TicketPriority,
} from "@tinadmin/core/support";
import { getCurrentTenant } from "@/core/multi-tenancy/server";

/**
 * Get all support tickets for the current tenant (portal)
 */
export async function getAllSupportTickets(filters?: {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string;
  created_by?: string;
  category_id?: string;
}) {
  const tenantId = await getCurrentTenant();
  if (!tenantId) throw new Error("Tenant not found. Please sign in.");
  return await getSupportTickets(filters, tenantId);
}

/**
 * Get a support ticket by ID (portal)
 */
export async function getSupportTicket(ticketId: string) {
  const tenantId = await getCurrentTenant();
  if (!tenantId) throw new Error("Tenant not found. Please sign in.");
  return await getSupportTicketById(ticketId, tenantId);
}

/**
 * Create a new support ticket (portal; no email notification)
 */
export async function createTicket(input: CreateTicketInput) {
  const tenantId = await getCurrentTenant();
  if (!tenantId) throw new Error("Tenant not found. Please sign in.");
  return await createSupportTicket(input, tenantId);
}
