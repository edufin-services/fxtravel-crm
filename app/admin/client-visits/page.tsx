import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAllBranches, getAllClientVisits, getAllUsers } from "@/lib/db";
import { getSession } from "@/lib/session";
import AdminClientVisitsClient from "./AdminClientVisitsClient";

export const dynamic = "force-dynamic";

export default async function AdminClientVisitsPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [leads, users, branches] = await Promise.all([
    getAllClientVisits(),
    getAllUsers(),
    getAllBranches(),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const visits = leads.map((l) => ({
    id: l.id,
    name: l.name,
    companyName: l.companyName,
    designation: l.designation,
    phone: l.phone,
    email: l.email,
    yearlyVolume: l.yearlyVolume,
    rateOfferedCN: l.rateOfferedCN,
    rateOfferedCard: l.rateOfferedCard,
    rateOfferedTTDD: l.rateOfferedTTDD,
    nextFollowUp: l.nextFollowUp,
    feedback: l.feedback,
    clientVisitStatus: l.clientVisitStatus,
    ownerId: l.ownerId,
    ownerName: (l.ownerId ? userMap.get(l.ownerId) : undefined) || l.assignAgent || "Admin",
    assignAgent: l.assignAgent,
    assignedBranchId: l.assignedBranchId,
    assignedBranchName: l.assignedBranchName,
    notes: l.notes,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }));

  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading client visits...</div>}>
      <AdminClientVisitsClient
        initialVisits={visits}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          company: u.company,
        }))}
        branches={branches.map((b: any) => ({
          id: b.id,
          name: b.name,
          city: b.city,
        }))}
      />
    </Suspense>
  );
}
