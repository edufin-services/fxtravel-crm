"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CHANNELS, SERVICES, STAGES, type Stage } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import { SearchIcon } from "@/app/dashboard/icons";
import LeadDrawer, { type DrawerLead } from "@/app/dashboard/leads/LeadDrawer";
import SetReminderModal from "@/app/dashboard/leads/SetReminderModal";

type Lead = DrawerLead & { value: number; ownerId: string };
type Agent = { id: string; name: string; email: string; company: string };

const STAGE_COLORS: Record<string, string> = {
  Initial: "bg-blue-50 text-blue-700",
  Connected: "bg-amber-50 text-amber-700",
  Confirmed: "bg-emerald-50 text-emerald-700",
  Closed: "bg-red-50 text-red-700",
};

const stageMeta: Record<string, { dot: string; border: string; badge: string; text: string }> = {
  Initial:   { dot: "bg-blue-500",   border: "border-t-blue-400",   badge: "bg-blue-600 text-white",    text: "text-blue-600" },
  Connected: { dot: "bg-amber-500",  border: "border-t-amber-400",  badge: "bg-amber-600 text-white",   text: "text-amber-600" },
  Confirmed: { dot: "bg-emerald-500",border: "border-t-emerald-400",badge: "bg-emerald-600 text-white", text: "text-emerald-600" },
  Closed:    { dot: "bg-red-500",    border: "border-t-red-400",    badge: "bg-red-600 text-white",     text: "text-red-600" },
};

const LEAD_COLORS = [
  { value: "",        bg: "bg-white",          border: "border-zinc-200/90",   accent: "" },
  { value: "sky",     bg: "bg-sky-100/90",     border: "border-sky-400/80",    accent: "border-l-4 border-l-sky-600" },
  { value: "emerald", bg: "bg-emerald-100/90", border: "border-emerald-400/80",accent: "border-l-4 border-l-emerald-600" },
  { value: "amber",   bg: "bg-amber-100/90",   border: "border-amber-400/80",  accent: "border-l-4 border-l-amber-600" },
  { value: "violet",  bg: "bg-violet-100/90",  border: "border-violet-400/80", accent: "border-l-4 border-l-violet-600" },
  { value: "rose",    bg: "bg-rose-100/90",    border: "border-rose-400/80",   accent: "border-l-4 border-l-rose-600" },
  { value: "orange",  bg: "bg-orange-100/90",  border: "border-orange-400/80", accent: "border-l-4 border-l-orange-600" },
];

function cardBg(color?: string) {
  const c = LEAD_COLORS.find((x) => x.value === (color ?? "")) ?? LEAD_COLORS[0];
  return `${c.bg} ${c.border} ${c.accent}`;
}

const channelPill: Record<string, string> = {
  WhatsApp: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Instagram: "bg-pink-50 text-pink-700 border-pink-200",
  Ads:      "bg-purple-50 text-purple-700 border-purple-200",
  Email:    "bg-blue-50 text-blue-700 border-blue-200",
  "Referral/Others": "bg-amber-50 text-amber-700 border-amber-200",
  "Google Sheets": "bg-emerald-100/80 text-emerald-800 border-emerald-300",
  Justdial: "bg-orange-50 text-orange-700 border-orange-200",
};

function fmt(v: number) {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

export default function AdminLeadsClient({ initialLeads, agents }: { initialLeads: Lead[]; agents: Agent[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [reminderLead, setReminderLead] = useState<Lead | null>(null);

  const agentMap = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a.name])), [agents]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!q) return sorted;
    return sorted.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      (l.phone ?? "").includes(q) ||
      (l.email ?? "").toLowerCase().includes(q) ||
      l.stage.toLowerCase().includes(q) ||
      (agentMap[l.ownerId] ?? "").toLowerCase().includes(q)
    );
  }, [leads, query, agentMap]);

  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0);

  const handleDrop = async (toStage: Stage) => {
    if (!draggingId) return;
    const targetLead = leads.find((l) => l.id === draggingId);
    if (!targetLead || targetLead.stage === toStage) {
      setDraggingId(null);
      setDragOverStage(null);
      return;
    }

    setLeads((prev) => prev.map((l) => l.id === draggingId ? { ...l, stage: toStage } : l));
    setDraggingId(null);
    setDragOverStage(null);

    await fetch(`/api/admin/leads/${draggingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: toStage }),
    });
  };

  async function handleUpdateLead(data: any) {
    if (!editingLead) return { error: "No lead selected." };
    const res = await fetch(`/api/admin/leads/${editingLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok && body.lead) {
      setLeads((prev) => prev.map((l) => (l.id === body.lead.id ? { ...l, ...body.lead } : l)));
      setEditingLead((prev) => (prev?.id === body.lead.id ? { ...prev, ...body.lead } : prev));
    }
    return body;
  }

  async function deleteLead(id: string) {
    if (!confirm("Move this lead to trash? You can restore it later from the Trash tab.")) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setEditingLead(null);
    await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
  }

  function patchLead(id: string, patch: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setEditingLead((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">All Leads</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {leads.length} leads across all users &middot; Pipeline: {fmt(totalValue)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle: Icon-only buttons */}
          <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-100 p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center justify-center rounded-lg p-2 transition-colors ${
                viewMode === "kanban" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="Kanban View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center justify-center rounded-lg p-2 transition-colors ${
                viewMode === "table" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="List View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-400 shadow-sm max-w-sm">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search leads by name, phone, stage, or user..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
        />
      </div>

      {/* ── KANBAN VIEW ────────────────────────────────────────────────────────── */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-start">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === stage);
            const meta = stageMeta[stage] ?? stageMeta.Initial;
            const isDragTarget = dragOverStage === stage;

            return (
              <div
                key={stage}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => handleDrop(stage)}
                className={`flex flex-col rounded-2xl border bg-zinc-50/50 p-4 transition-all ${
                  isDragTarget ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200" : "border-zinc-200/80"
                }`}
              >
                {/* Column header matching screenshot */}
                <div className="mb-4 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900">{stage}</h2>
                  </div>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${meta.badge}`}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards stack */}
                <div className="flex flex-col gap-3 min-h-[220px]">
                  {stageLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border border-dashed border-zinc-300/80 bg-white/60">
                      <div className={`mb-2 h-7 w-7 rounded-full ${meta.dot} opacity-20`} />
                      <p className="text-xs text-zinc-400 font-semibold">No enquiries in {stage}</p>
                    </div>
                  ) : (
                    stageLeads.map((deal) => {
                      const nextStage = STAGES[STAGES.indexOf(stage) + 1] as Stage | undefined;
                      const nextMeta = nextStage ? stageMeta[nextStage] : undefined;
                      const assignedName = agentMap[deal.ownerId] ?? deal.assignAgent ?? "Unassigned";

                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={() => setDraggingId(deal.id)}
                          onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                          onClick={() => setEditingLead(deal)}
                          className={`group cursor-pointer rounded-2xl border p-4 shadow-xs transition-all hover:shadow-md ${cardBg(deal.color)} ${
                            draggingId === deal.id ? "opacity-30 scale-95" : ""
                          }`}
                        >
                          {/* Name */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-xl font-black text-zinc-900 leading-tight group-hover:text-emerald-800 transition-colors">
                              {deal.name}
                            </p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${channelPill[deal.channel] ?? "bg-zinc-50 text-zinc-600 border-zinc-200"}`}>
                              {deal.channel}
                            </span>
                          </div>

                          {/* Phone */}
                          {deal.phone && (
                            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-600 font-semibold">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 shrink-0">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.9.36 1.84.58 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round"/></svg>
                              </span>
                              <span>{deal.phone}</span>
                            </div>
                          )}

                          {/* Branch Badge */}
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              {assignedName}
                            </span>
                          </div>

                          {/* Services */}
                          {((deal.services && deal.services.length > 0) || deal.serviceType) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(deal.services && deal.services.length > 0 ? deal.services : [deal.serviceType!]).map((svc) => (
                                <span key={svc} className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800 shadow-2xs">
                                  {svc}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Time & Note Button */}
                          <div className="mt-3 flex items-center justify-between gap-2 pt-1 border-t border-zinc-100/80">
                            <span className="text-[11px] text-zinc-400 font-medium">{formatRelativeTime(deal.createdAt)}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingLead(deal); }}
                              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                deal.notes
                                  ? "bg-amber-100/90 text-amber-900 border border-amber-300/80 shadow-2xs"
                                  : "bg-zinc-100 text-zinc-600 border border-zinc-200/60"
                              }`}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/></svg>
                              {deal.notes ? "View Note" : "+ Add Note"}
                            </button>
                          </div>

                          {/* Footer Row: Reminder + Move stage */}
                          <div className="mt-3.5 flex items-center justify-between border-t border-zinc-100 pt-3 gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setReminderLead(deal); }}
                              className={`flex h-7 w-7 items-center justify-center rounded-xl border transition-all shadow-2xs shrink-0 ${
                                deal.reminderAt
                                  ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                                  : "bg-zinc-100 text-zinc-400 border-zinc-200/80 hover:bg-zinc-200 hover:text-zinc-700"
                              }`}
                              title={deal.reminderAt ? `Reminder active` : "Set Reminder Alert"}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            </button>

                            {nextStage ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDrop(nextStage); }}
                                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all shadow-xs hover:shadow-md ${
                                  nextMeta ? `${nextMeta.badge} hover:opacity-95` : "bg-zinc-900 text-white"
                                }`}
                              >
                                Move to {nextStage}
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                            ) : (
                              <span className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Closed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Lead button matching screenshot */}
                <button
                  onClick={() => setEditingLead(null)}
                  className="mt-3 flex-none flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 shadow-2xs transition-all"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                  Add Lead
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE / LIST VIEW ───────────────────────────────────────────────── */
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Lead</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Assigned To</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Stage</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Channel</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 text-right">Value</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Created</th>
                  <th className="px-5 py-3 w-32" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center text-sm text-zinc-400">
                      {leads.length === 0 ? "No leads yet" : "No leads match your search"}
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-zinc-50/60 transition-colors cursor-pointer" onClick={() => setEditingLead(lead)}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-zinc-900 leading-tight">{lead.name}</p>
                        {lead.phone && <p className="text-xs text-zinc-400 mt-0.5">{lead.phone}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 text-xs font-medium">{agentMap[lead.ownerId] ?? lead.assignAgent ?? <span className="text-zinc-300">Unassigned</span>}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STAGE_COLORS[lead.stage] ?? "bg-zinc-100 text-zinc-600"}`}>
                          {lead.stage}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 text-xs font-medium">{lead.channel}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-zinc-800 tabular-nums">{lead.value ? fmt(lead.value) : <span className="text-zinc-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-zinc-400 text-xs">
                        {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingLead(lead); }}
                            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}
                            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Trash
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredLeads.length > 0 && (
              <div className="border-t border-zinc-50 px-5 py-2.5 text-xs text-zinc-400">
                {filteredLeads.length} leads · Total pipeline value: {fmt(totalValue)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reminder Modal ──────────────────────────────────────────────────── */}
      {reminderLead && (
        <SetReminderModal
          leadId={reminderLead.id}
          leadName={reminderLead.name}
          onClose={() => setReminderLead(null)}
          onSaved={(reminderAt, note) => {
            setLeads((prev) => prev.map((l) => l.id === reminderLead.id ? { ...l, notes: note, reminderAt } : l));
          }}
        />
      )}

      {/* ── Lead Drawer (Details + Chat + Tasks + Documents + Reminders) ───────── */}
      {editingLead && (
        <LeadDrawer
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSubmit={handleUpdateLead}
          onDelete={() => deleteLead(editingLead.id)}
          onDocumentsChange={(docs) => patchLead(editingLead.id, { documents: docs })}
          onProposalDocChange={(doc) => patchLead(editingLead.id, { proposalDoc: doc })}
          onRegistrationDocChange={(doc) => patchLead(editingLead.id, { registrationDoc: doc })}
          onAdmissionLetterChange={(doc) => patchLead(editingLead.id, { admissionLetter: doc })}
          onInvoicesChange={(docs) => patchLead(editingLead.id, { invoices: docs })}
          onOtcInvoicesChange={(docs) => patchLead(editingLead.id, { otcInvoices: docs })}
          onInvitationLetterChange={(doc) => patchLead(editingLead.id, { invitationLetter: doc })}
          onThirdPaymentInvoicesChange={(docs) => patchLead(editingLead.id, { thirdPaymentInvoices: docs })}
          onVisaDocumentsChange={(docs) => patchLead(editingLead.id, { visaDocuments: docs })}
        />
      )}
    </div>
  );
}
