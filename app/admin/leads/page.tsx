import { Suspense } from "react";
import { getAllLeads, getAllUsers } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import AdminLeadsClient from "./AdminLeadsClient";

export default async function AdminLeadsPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [leads, agents] = await Promise.all([getAllLeads(), getAllUsers()]);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading leads...</div>}>
      <AdminLeadsClient
        initialLeads={leads}
        agents={agents.map((a) => ({ id: a.id, name: a.name, email: a.email, company: a.company }))}
      />
    </Suspense>
  );
}
