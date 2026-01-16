/**
 * Support Ticketing System Types
 */

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportCategory {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category_id: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: SupportCategory | null;
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  assigned_to_user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface SupportTicketThread {
  id: string;
  ticket_id: string;
  tenant_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface SupportTicketAttachment {
  id: string;
  ticket_id: string;
  thread_id: string | null;
  tenant_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  // Joined fields
  uploaded_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface SupportTicketHistory {
  id: string;
  ticket_id: string;
  tenant_id: string;
  changed_by: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  // Joined fields
  changed_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface CreateTicketInput {
  subject: string;
  description?: string;
  priority?: TicketPriority;
  category_id?: string;
  assigned_to?: string;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category_id?: string;
  assigned_to?: string;
}

export interface CreateThreadInput {
  message: string;
  is_internal?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  is_active?: boolean;
}

