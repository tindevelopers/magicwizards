"use server";

import {
  getSupportTicketAttachments,
  createSupportTicketAttachment,
  getAttachmentDownloadUrl,
} from "@tinadmin/core/support";
import { getCurrentTenant } from "@/core/multi-tenancy/server";
import { createClient } from "@/core/database/server";

/**
 * Get all attachments for a support ticket (portal: uses current tenant)
 */
export async function getTicketAttachments(ticketId: string, threadId?: string) {
  const tenantId = await getCurrentTenant();
  if (!tenantId) throw new Error("Tenant not found. Please sign in.");
  return await getSupportTicketAttachments(ticketId, threadId, tenantId);
}

/**
 * Upload a file attachment for a support ticket (portal: uses current tenant)
 */
export async function uploadTicketAttachment(
  ticketId: string,
  file: File,
  threadId?: string
) {
  const tenantId = await getCurrentTenant();
  if (!tenantId) throw new Error("Tenant not found. Please sign in.");
  const supabase = await createClient();

  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${tenantId}/${ticketId}/${timestamp}-${sanitizedFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("support-tickets")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  return await createSupportTicketAttachment(
    {
      ticket_id: ticketId,
      thread_id: threadId,
      file_name: file.name,
      file_path: `support-tickets/${filePath}`,
      file_size: file.size,
      mime_type: file.type,
    },
    tenantId
  );
}

/**
 * Get a signed URL for downloading an attachment (portal: uses current tenant)
 */
export async function getAttachmentUrl(
  attachmentId: string,
  expiresIn: number = 3600
) {
  const tenantId = await getCurrentTenant();
  if (!tenantId) throw new Error("Tenant not found. Please sign in.");
  return await getAttachmentDownloadUrl(attachmentId, expiresIn, tenantId);
}
