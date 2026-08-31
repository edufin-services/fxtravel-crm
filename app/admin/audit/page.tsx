import { redirect } from "next/navigation";
import { getAllLeads, getAllUsers, getLeadActivities } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [activities, leads, users] = await Promise.all([
    getLeadActivities({ limit: 100 }),
    getAllLeads(),
    getAllUsers(),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  // Build audit logs from real logged activities, falling back to leads if empty
  let auditLogs = activities.map((act) => {
    let actionLabel = "Lead Activity";
    let badgeColor = "bg-zinc-100 text-zinc-800 border-zinc-200";

    if (act.type === "new_lead") {
      actionLabel = "New Lead Ingestion";
      badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
    } else if (act.type === "stage_change") {
      actionLabel = `Stage Transition (${act.previousStage || "Init"} ➔ ${act.newStage || "New"})`;
      badgeColor = "bg-purple-100 text-purple-800 border-purple-200";
    } else if (act.type === "lead_confirmed") {
      actionLabel = "🎯 Lead Confirmed / Deal Won";
      badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
    } else if (act.type === "lead_deleted") {
      actionLabel = "Lead Deleted / Closed";
      badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
    } else if (act.type === "lead_updated") {
      actionLabel = "Lead Profile Updated";
      badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
    }

    return {
      id: act.id,
      action: actionLabel,
      user: act.ownerName || userMap.get(act.ownerId || "") || "System",
      details: `${act.leadName}${act.phone ? ` (${act.phone})` : ""} · ${act.details || act.channel || ""}`,
      timestamp: act.timestamp,
      badgeColor,
      status: "Success",
    };
  });

  if (auditLogs.length === 0) {
    auditLogs = leads.slice(0, 30).map((lead, idx) => ({
      id: `audit-${lead.id}-${idx}`,
      action: lead.stage === "Confirmed" ? "🎯 Lead Confirmed" : "Lead Entry Processed",
      user: userMap.get(lead.ownerId) || "System Executive",
      details: `${lead.name} · ${lead.channel} · Stage: ${lead.stage}`,
      timestamp: lead.createdAt,
      badgeColor: lead.stage === "Confirmed" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-blue-100 text-blue-800 border-blue-200",
      status: "Success",
    }));
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Audit Logs &amp; Real-time Activity Stream</h1>
            <span className="rounded-full bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 border border-rose-200">
              Live Audit Log
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Real-time audit trailing of stage transitions, newly registered inquiries, confirmed deals, and executive activities
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900">Recent System Activity Stream ({auditLogs.length})</h2>
          <span className="text-xs text-zinc-400 font-medium">Logged in MongoDB LeadActivity</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User / Executive</th>
                <th className="px-4 py-3">Action Performed</th>
                <th className="px-4 py-3">Event Details</th>
                <th className="px-4 py-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-zinc-900 whitespace-nowrap">{formatRelativeTime(log.timestamp)}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-800 whitespace-nowrap">{log.user}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold border ${log.badgeColor}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 max-w-md truncate">{log.details}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200">
                      {log.status}
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
