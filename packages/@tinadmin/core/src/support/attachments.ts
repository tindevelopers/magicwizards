"use server";

import { createClient } from "@/core/database/server";
import { createTenantAwareClient, getSupabaseClient, type TenantAwareClient } from "@/core/database/tenant-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/core/database";
import type { SupportTicketAttachment } from "./types";

/**
 * Get all attachments for a support ticket
 */
export async function getSupportTicketAttachments(
  ticketId: string,
  threadId?: string,
  tenantId?: string
): Promise<SupportTicketAttachment[]> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  let query = supabase
    .from("support_ticket_attachments")
    .select(`
      *,
      uploaded_by_user:users!support_ticket_attachments_uploaded_by_fkey(id, full_name, email)
    `)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  
  if (threadId) {
    query = query.eq("thread_id", threadId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch ticket attachments: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get an attachment by ID
 */
export async function getSupportTicketAttachmentById(
  attachmentId: string,
  tenantId?: string
): Promise<SupportTicketAttachment | null> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  const { data, error } = await supabase
    .from("support_ticket_attachments")
    .select(`
      *,
      uploaded_by_user:users!support_ticket_attachments_uploaded_by_fkey(id, full_name, email)
    `)
    .eq("id", attachmentId)
    .single();
  
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch ticket attachment: ${error.message}`);
  }
  
  return data;
}

/**
 * Create a new attachment record
 */
export async function createSupportTicketAttachment(
  input: {
    ticket_id: string;
    thread_id?: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
  },
  tenantId?: string
): Promise<SupportTicketAttachment> {
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
    .eq("id", input.ticket_id)
    .single();
  
  if (!ticket) {
    throw new Error("Ticket not found");
  }
  
  const finalTenantId = tenantId || (ticket as { tenant_id: string }).tenant_id;
  
  const { data, error } = await supabase
    .from("support_ticket_attachments")
    .insert({
      ticket_id: input.ticket_id,
      thread_id: input.thread_id || null,
      tenant_id: finalTenantId,
      file_name: input.file_name,
      file_path: input.file_path,
      file_size: input.file_size,
      mime_type: input.mime_type,
      uploaded_by: user.id,
    } as any)
    .select(`
      *,
      uploaded_by_user:users!support_ticket_attachments_uploaded_by_fkey(id, full_name, email)
    `)
    .single();
  
  if (error) {
    throw new Error(`Failed to create ticket attachment: ${error.message}`);
  }
  
  return data;
}

/**
 * Delete an attachment
 */
export async function deleteSupportTicketAttachment(
  attachmentId: string,
  tenantId?: string
): Promise<void> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  // Get attachment info to delete file from storage
  const { data: attachment } = await supabase
    .from("support_ticket_attachments")
    .select("file_path")
    .eq("id", attachmentId)
    .single();
  
  if (attachment) {
    // Delete file from Supabase Storage
    const filePath = (attachment as { file_path: string }).file_path.replace(/^\/?support-tickets\//, "");
    const { error: storageError } = await supabase.storage
      .from("support-tickets")
      .remove([filePath]);
    
    if (storageError) {
      console.error("Failed to delete file from storage:", storageError);
      // Continue with database deletion even if storage deletion fails
    }
  }
  
  // Delete database record
  const { error } = await supabase
    .from("support_ticket_attachments")
    .delete()
    .eq("id", attachmentId);
  
  if (error) {
    throw new Error(`Failed to delete ticket attachment: ${error.message}`);
  }
}

/**
 * Get a signed URL for downloading an attachment
 */
export async function getAttachmentDownloadUrl(
  attachmentId: string,
  expiresIn: number = 3600,
  tenantId?: string
): Promise<string | null> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  const { data: attachment } = await supabase
    .from("support_ticket_attachments")
    .select("file_path")
    .eq("id", attachmentId)
    .single();
  
  if (!attachment) {
    return null;
  }
  
  const filePath = (attachment as { file_path: string }).file_path.replace(/^\/?support-tickets\//, "");
  const { data } = await supabase.storage
    .from("support-tickets")
    .createSignedUrl(filePath, expiresIn);
  
  return data?.signedUrl || null;
}

