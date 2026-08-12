"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Lead = {
  id: string;
  ownerId: string;
  name: string;
  channel: string;
  value: number;
  stage: string;
  createdAt: string;
  deletedAt?: string | null;
  email?: string;
  phone?: string;
};

const STAGE_COLORS: Record<string, string> = {
  Initial: "bg-blue-50 text-blue-700",
  Connected: "bg-amber-50 text-amber-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

function fmt(v: number) {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

export default function BranchTrashClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [query, setQuery] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...leads].sort((a, b) => new Date(b.deletedAt ?? b.createdAt).getTime() - new Date(a.deletedAt ?? a.createdAt).getTime());
    if (!q) return sorted;
    return sorted.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      (l.phone ?? "").includes(q) ||
      (l.email ?? "").toLowerCase().includes(q) ||
      l.stage.toLowerCase().includes(q)
    );
  }, [leads, query]);

  async function restoreLead(id: string) {
    setRestoringId(id);
    const res = await fetch(`/api/leads/${id}/restore`, { method: "POST" });
    if (res.ok) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
    }
    setRestoringId(null);
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Trash</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {leads.length} deleted lead{leads.length !== 1 ? "s" : ""} · Restore to bring a lead back into your active pipeline
          </p>
        </div>
        <Link href="/dashboard/leads" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
          Back to Pipeline
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-400 shadow-xs max-w-sm">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="flex-none">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search deleted leads..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Lead</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Channel</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Stage</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 text-right">Value</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Deleted</th>
                <th className="px-5 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-zinc-400">
                    {leads.length === 0 ? "Trash is empty" : "No deleted leads match your search"}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-zinc-900">{lead.name}</p>
                      {lead.phone && <p className="text-xs text-zinc-400 mt-0.5">{lead.phone}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">{lead.channel}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STAGE_COLORS[lead.stage] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-zinc-800 tabular-nums">{lead.value ? fmt(lead.value) : <span className="text-zinc-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs">
                      {lead.deletedAt ? new Date(lead.deletedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => restoreLead(lead.id)}
                        disabled={restoringId === lead.id}
                        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                      >
                        {restoringId === lead.id ? "Restoring..." : "Restore"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredLeads.length > 0 && (
            <div className="border-t border-zinc-50 px-5 py-2.5 text-xs text-zinc-400">
              {filteredLeads.length} deleted lead{filteredLeads.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
