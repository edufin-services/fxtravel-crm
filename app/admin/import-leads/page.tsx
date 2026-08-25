import { redirect } from "next/navigation";
import { getAllUsers, getImportedLeads } from "@/lib/db";
import { getSession } from "@/lib/session";
import ImportLeadsClient from "./ImportLeadsClient";

export const dynamic = "force-dynamic";

export default async function AdminImportLeadsPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [importedLeads, users] = await Promise.all([
    getImportedLeads(),
    getAllUsers(),
  ]);

  const sanitizedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    company: u.company || "CRM User",
  }));

  return (
    <ImportLeadsClient
      initialLeads={importedLeads}
      users={sanitizedUsers}
    />
  );
}
