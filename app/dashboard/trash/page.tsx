import { getDeletedLeadsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import BranchTrashClient from "./BranchTrashClient";

export default async function BranchTrashPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const leads = await getDeletedLeadsByOwner(session.userId);

  return <BranchTrashClient initialLeads={leads} />;
}
