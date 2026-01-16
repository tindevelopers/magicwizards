import TicketForm from "@/components/support/TicketForm";
import { getAllSupportCategories } from "@/app/actions/support/categories";

export default async function NewTicketPage() {
  const categories = await getAllSupportCategories();

  return <TicketForm categories={categories} agents={[]} />;
}

