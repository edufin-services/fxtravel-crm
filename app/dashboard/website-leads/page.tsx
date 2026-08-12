import { redirect } from "next/navigation";
import { getWebsiteLeads } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const neetBadge: Record<string, string> = {
  Appeared: "bg-blue-50 text-blue-700",
  Passed: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  "Not Applicable": "bg-zinc-100 text-zinc-500",
};

export default async function WebsiteLeadsPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const leads = await getWebsiteLeads();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Website Leads</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Enquiries from the website · {leads.length} total
          </p>
        </div>
        {leads.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="text-sm font-bold text-zinc-900">{leads.length}</span>
            <span className="text-xs text-zinc-400">enquiries</span>
          </div>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-20 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-zinc-600">No website leads yet</p>
          <p className="mt-1 text-xs text-zinc-400">They will appear here once someone submits the enquiry form.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-zinc-50/60 text-zinc-400">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide">Mobile</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide">State</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide">NEET Status</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide">Budget</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide">Country</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide">Remarks</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-50/60 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-zinc-900">{lead.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {lead.mobile ? (
                        <a href={`tel:${lead.mobile}`} className="text-brand-600 hover:underline font-medium">{lead.mobile}</a>
                      ) : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500">{lead.state || <span className="text-zinc-300">—</span>}</td>
                    <td className="px-5 py-3.5">
                      {lead.neetStatus ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${neetBadge[lead.neetStatus] ?? "bg-zinc-100 text-zinc-500"}`}>
                          {lead.neetStatus}
                        </span>
                      ) : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500">{lead.budget || <span className="text-zinc-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{lead.preferredCountry || <span className="text-zinc-300">—</span>}</td>
                    <td className="px-5 py-3.5 max-w-[200px] truncate text-zinc-400" title={lead.remarks ?? ""}>
                      {lead.remarks || <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400 whitespace-nowrap">{formatRelativeTime(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
