"use server";

import { createClient } from "@/core/database/server";
import { createTenantAwareClient, getSupabaseClient } from "@/core/database/tenant-client";
import type { SupportTicketThread, CreateThreadInput } from "./types";

/**
 * Get all threads for a support ticket
 */
export async function getSupportTicketThreads(
  ticketId: string,
  options?: {
    includeInternal?: boolean;
  },
  tenantId?: string
): Promise<SupportTicketThread[]> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  let query = supabase
    .from("support_ticket_threads")
    .select(`
      *,
      user:users!support_ticket_threads_user_id_fkey(id, full_name, email, avatar_url)
    `)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  
  // Filter out internal threads if not requested
  if (!options?.includeInternal) {
    query = query.eq("is_internal", false);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch ticket threads: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get a thread by ID
 */
export async function getSupportTicketThreadById(
  threadId: string,
  tenantId?: string
): Promise<SupportTicketThread | null> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  const { data, error } = await supabase
    .from("support_ticket_threads")
    .select(`
      *,
      user:users!support_ticket_threads_user_id_fkey(id, full_name, email, avatar_url)
    `)
    .eq("id", threadId)
    .single();
  
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch ticket thread: ${error.message}`);
  }
  
  return data;
}

/**
 * Create a new thread/reply for a support ticket
 */
export async function createSupportTicketThread(
  ticketId: string,
  input: CreateThreadInput,
  tenantId?: string
): Promise<SupportTicketThread> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  
  // Verify ticket exists and get tenant_id
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("tenant_id")
    .eq("id", ticketId)
    .single();
  
  if (!ticket) {
    throw new Error("Ticket not found");
  }
  
  const finalTenantId = tenantId || (ticket as { tenant_id: string }).tenant_id;
  
  const { data, error } = await supabase
    .from("support_ticket_threads")
    .insert({
      ticket_id: ticketId,
      tenant_id: finalTenantId,
      user_id: user.id,
      message: input.message,
      is_internal: input.is_internal || false,
    } as any)
    .select(`
      *,
      user:users!support_ticket_threads_user_id_fkey(id, full_name, email, avatar_url)
    `)
    .single();
  
  if (error) {
    throw new Error(`Failed to create ticket thread: ${error.message}`);
  }
  
  return data;
}

/**
 * Update a thread
 */
export async function updateSupportTicketThread(
  threadId: string,
  input: { message?: string; is_internal?: boolean },
  tenantId?: string
): Promise<SupportTicketThread> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  const updateData: any = {};
  if (input.message !== undefined) updateData.message = input.message;
  if (input.is_internal !== undefined) updateData.is_internal = input.is_internal;
  
  const { data, error } = await (supabase
    .from("support_ticket_threads") as any)
    .update(updateData)
    .eq("id", threadId)
    .select(`
      *,
      user:users!support_ticket_threads_user_id_fkey(id, full_name, email, avatar_url)
    `)
    .single();
  
  if (error) {
    throw new Error(`Failed to update ticket thread: ${error.message}`);
  }
  
  return data;
}

/**
 * Delete a thread
 */
export async function deleteSupportTicketThread(
  threadId: string,
  tenantId?: string
): Promise<void> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  const { error } = await supabase
    .from("support_ticket_threads")
    .delete()
    .eq("id", threadId);
  
  if (error) {
    throw new Error(`Failed to delete ticket thread: ${error.message}`);
  }
}

