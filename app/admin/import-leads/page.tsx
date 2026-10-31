import { redirect } from "next/navigation";
import { getAllLeads, getAllUsers, getImportedLeads } from "@/lib/db";
import { getSession } from "@/lib/session";
import ImportLeadsClient from "./ImportLeadsClient";

export const dynamic = "force-dynamic";

export default async function AdminImportLeadsPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [importedLeads, users, allCrmLeads] = await Promise.all([
    getImportedLeads(),
    getAllUsers(),
    getAllLeads(),
  ]);

  const existingCrmPhones = allCrmLeads
    .map((l) => (l.phone || "").replace(/\D/g, "").slice(-10))
    .filter((p) => p.length >= 7);

  const sanitizedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    company: u.company || "CRM User",
    isLeadPaused: !!u.isLeadPaused,
    leadPauseReason: u.leadPauseReason || "",
  }));

  return (
    <ImportLeadsClient
      initialLeads={importedLeads}
      users={sanitizedUsers}
      existingCrmPhones={existingCrmPhones}
    />
  );
}
