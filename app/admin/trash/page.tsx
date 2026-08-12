import { getAllUsers, getDeletedLeads } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import AdminTrashClient from "./AdminTrashClient";

export default async function AdminTrashPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [leads, agents] = await Promise.all([getDeletedLeads(), getAllUsers()]);

  return (
    <AdminTrashClient
      initialLeads={leads}
      agents={agents.map((a) => ({ id: a.id, name: a.name, email: a.email, company: a.company }))}
    />
  );
}
