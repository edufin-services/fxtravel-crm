import { redirect } from "next/navigation";
import { getAllUsers, getAllLeads } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [users, leads] = await Promise.all([getAllUsers(), getAllLeads()]);

  const userStats = users.map((u) => {
    const userLeads = leads.filter((l) => l.ownerId === u.id);
    return {
      ...u,
      totalLeads: userLeads.length,
    };
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">CRM Users &amp; Registered Executives</h1>
            <span className="rounded-full bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 border border-rose-200">
              {users.length} Users
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Manage registered company users and CRM activity metrics
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900">Registered Accounts</h2>

        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Company / User</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Assigned Leads</th>
                <th className="px-4 py-3">Account Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {userStats.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-zinc-900">{u.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                  <td className="px-4 py-3 text-zinc-700 font-semibold">{u.company || "Default User"}</td>
                  <td className="px-4 py-3 text-zinc-500">{u.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-bold text-zinc-800">
                      {u.totalLeads}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200">
                      User / Account Owner
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
