import { Suspense } from "react";
import { getAllBranches, getAllLeads, getAllUsers } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import AdminLeadsClient from "./AdminLeadsClient";

export default async function AdminLeadsPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [leads, agents, branches] = await Promise.all([
    getAllLeads(),
    getAllUsers(),
    getAllBranches(),
  ]);

  const branchLocations = Array.from(
    new Set((branches as any[]).map((b) => b.city?.trim()).filter(Boolean))
  ) as string[];

  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading leads...</div>}>
      <AdminLeadsClient
        initialLeads={leads}
        agents={agents.map((a) => ({ id: a.id, name: a.name, email: a.email, company: a.company }))}
        branchLocations={branchLocations}
      />
    </Suspense>
  );
}
