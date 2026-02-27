import { getSupportTicket } from "@/app/actions/support/tickets";
import { getTicketThreads } from "@/app/actions/support/threads";
import { getTicketAttachments } from "@/app/actions/support/attachments";
import TicketDetail from "@/components/support/TicketDetail";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const ticket = await getSupportTicket(params.id);
  
  if (!ticket) {
    notFound();
  }

  // For portal, don't show internal threads
  const [threads, attachments] = await Promise.all([
    getTicketThreads(ticket.id, { includeInternal: false }),
    getTicketAttachments(ticket.id),
  ]);

  return (
    <TicketDetail
      ticket={ticket}
      threads={threads}
      attachments={attachments}
      isCustomerView={true}
    />
  );
}

