import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAllBranches, getAllLeads, getAllUsers } from "@/lib/db";
import { getSession } from "@/lib/session";
import AdminBranchesClient from "./AdminBranchesClient";

export const dynamic = "force-dynamic";

export default async function AdminBranchesPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [leads, users, branches] = await Promise.all([
    getAllLeads(),
    getAllUsers(),
    getAllBranches(),
  ]);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading branch intelligence...</div>}>
      <AdminBranchesClient
        initialLeads={leads}
        initialBranches={branches as any}
        users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, company: u.company }))}
      />
    </Suspense>
  );
}
