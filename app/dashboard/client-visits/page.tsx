import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAllBranches, getClientVisitsByOwner, getUserById } from "@/lib/db";
import { getSession } from "@/lib/session";
import AdminClientVisitsClient from "@/app/admin/client-visits/AdminClientVisitsClient";

export const dynamic = "force-dynamic";

export default async function UserClientVisitsPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const [visits, user, branches] = await Promise.all([
    getClientVisitsByOwner(session.userId),
    getUserById(session.userId),
    getAllBranches(),
  ]);

  const userVisits = visits.map((v) => ({
    id: v.id,
    name: v.name,
    companyName: v.companyName,
    designation: v.designation,
    phone: v.phone,
    email: v.email,
    yearlyVolume: v.yearlyVolume,
    rateOfferedCN: v.rateOfferedCN,
    rateOfferedCard: v.rateOfferedCard,
    rateOfferedTTDD: v.rateOfferedTTDD,
    nextFollowUp: v.nextFollowUp,
    feedback: v.feedback,
    clientVisitStatus: v.clientVisitStatus,
    ownerId: v.ownerId,
    ownerName: user?.name || "Me",
    assignAgent: v.assignAgent,
    assignedBranchId: v.assignedBranchId || user?.branchId,
    assignedBranchName: v.assignedBranchName || user?.branchName,
    notes: v.notes,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }));

  const userOption = user
    ? [{ id: user.id, name: user.name, email: user.email, company: user.company }]
    : [];

  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading client visits...</div>}>
      <AdminClientVisitsClient
        initialVisits={userVisits}
        users={userOption}
        branches={branches.map((b: any) => ({ id: b.id, name: b.name, city: b.city }))}
      />
    </Suspense>
  );
}
