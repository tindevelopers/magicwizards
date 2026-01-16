/**
 * SUPPORT TICKETING DOMAIN
 * 
 * Support ticketing system module for managing customer support tickets.
 * 
 * PUBLIC API - Only import from this file!
 */

// ============================================================================
// TYPES
// ============================================================================
export type {
  TicketStatus,
  TicketPriority,
  SupportCategory,
  SupportTicket,
  SupportTicketThread,
  SupportTicketAttachment,
  SupportTicketHistory,
  CreateTicketInput,
  UpdateTicketInput,
  CreateThreadInput,
  CreateCategoryInput,
} from "./types";

// ============================================================================
// CATEGORIES
// ============================================================================
// ⚠️ SERVER-ONLY: Import directly from './categories' in server-side code:
//   import { getSupportCategories, createSupportCategory } from '@/core/support/categories';

export {
  getSupportCategories,
  getSupportCategoryById,
  createSupportCategory,
  updateSupportCategory,
  deleteSupportCategory,
} from "./categories";

// ============================================================================
// TICKETS
// ============================================================================
// ⚠️ SERVER-ONLY: Import directly from './tickets' in server-side code:
//   import { getSupportTickets, createSupportTicket } from '@/core/support/tickets';

export {
  getSupportTickets,
  getSupportTicketById,
  getSupportTicketByNumber,
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  getSupportTicketStats,
} from "./tickets";

// ============================================================================
// THREADS
// ============================================================================
// ⚠️ SERVER-ONLY: Import directly from './threads' in server-side code:
//   import { getSupportTicketThreads, createSupportTicketThread } from '@/core/support/threads';

export {
  getSupportTicketThreads,
  getSupportTicketThreadById,
  createSupportTicketThread,
  updateSupportTicketThread,
  deleteSupportTicketThread,
} from "./threads";

// ============================================================================
// ATTACHMENTS
// ============================================================================
// ⚠️ SERVER-ONLY: Import directly from './attachments' in server-side code:
//   import { getSupportTicketAttachments, createSupportTicketAttachment } from '@/core/support/attachments';

export {
  getSupportTicketAttachments,
  getSupportTicketAttachmentById,
  createSupportTicketAttachment,
  deleteSupportTicketAttachment,
  getAttachmentDownloadUrl,
} from "./attachments";

