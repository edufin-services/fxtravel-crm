"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CHANNELS, SERVICES, STAGES, type Channel, type Stage } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import LeadDrawer, { type DrawerLead, type LeadDocument } from "./LeadDrawer";
import SetReminderModal from "./SetReminderModal";

type Lead = DrawerLead & { value: number };

// ── Stage palette ──────────────────────────────────────────────────────────────
const stageMeta: Record<string, { dot: string; border: string; badge: string; text: string }> = {
  Initial:   { dot: "bg-blue-500",   border: "border-t-blue-400",   badge: "bg-blue-600 text-white",    text: "text-blue-600" },
  Connected: { dot: "bg-amber-500",  border: "border-t-amber-400",  badge: "bg-amber-600 text-white",   text: "text-amber-600" },
  Confirmed: { dot: "bg-emerald-500",border: "border-t-emerald-400",badge: "bg-emerald-600 text-white", text: "text-emerald-600" },
  Closed:    { dot: "bg-red-500",    border: "border-t-red-400",    badge: "bg-red-600 text-white",     text: "text-red-600" },
};

// ── Card colour tints ───────────────────────────────────────────────────────────
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

const COLOR_AVATAR_GRADIENTS: Record<string, string> = {
  sky: "from-sky-400 to-sky-600",
  emerald: "from-emerald-400 to-emerald-600",
  amber: "from-amber-400 to-amber-600",
  violet: "from-violet-400 to-violet-600",
  rose: "from-rose-400 to-rose-600",
  orange: "from-orange-400 to-orange-600",
};

function tableRowBg(color?: string) {
  switch (color) {
    case "sky":
      return "bg-sky-50/70 hover:bg-sky-100/80 border-l-4 border-l-sky-500";
    case "emerald":
      return "bg-emerald-50/70 hover:bg-emerald-100/80 border-l-4 border-l-emerald-500";
    case "amber":
      return "bg-amber-50/70 hover:bg-amber-100/80 border-l-4 border-l-amber-500";
    case "violet":
      return "bg-violet-50/70 hover:bg-violet-100/80 border-l-4 border-l-violet-500";
    case "rose":
      return "bg-rose-50/70 hover:bg-rose-100/80 border-l-4 border-l-rose-500";
    case "orange":
      return "bg-orange-50/70 hover:bg-orange-100/80 border-l-4 border-l-orange-500";
    default:
      return "bg-white hover:bg-zinc-50/80 border-l-4 border-l-transparent";
  }
}

// ── Channel pills ───────────────────────────────────────────────────────────────
const channelPill: Record<string, string> = {
  WhatsApp: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Instagram: "bg-pink-50 text-pink-700 border-pink-200",
  Facebook: "bg-blue-50 text-blue-700 border-blue-200",
  Ads:      "bg-purple-50 text-purple-700 border-purple-200",
  Email:    "bg-sky-50 text-sky-700 border-sky-200",
  "Referral/Others": "bg-amber-50 text-amber-700 border-amber-200",
};

// ── Avatar helpers ─────────────────────────────────────────────────────────────
const GRADIENTS: Record<string, string> = {
  A:"from-rose-400 to-rose-600",B:"from-pink-400 to-pink-600",C:"from-fuchsia-400 to-fuchsia-600",
  D:"from-violet-400 to-violet-600",E:"from-indigo-400 to-indigo-600",F:"from-blue-400 to-blue-600",
  G:"from-sky-400 to-sky-600",H:"from-cyan-400 to-cyan-600",I:"from-teal-400 to-teal-600",
  J:"from-emerald-400 to-emerald-600",K:"from-green-400 to-green-600",L:"from-lime-400 to-lime-600",
  M:"from-amber-400 to-amber-600",N:"from-orange-400 to-orange-600",O:"from-red-400 to-red-600",
  P:"from-rose-400 to-rose-600",Q:"from-purple-400 to-purple-600",R:"from-blue-400 to-blue-600",
  S:"from-sky-400 to-sky-600",T:"from-teal-400 to-teal-600",U:"from-cyan-400 to-cyan-600",
  V:"from-violet-400 to-violet-600",W:"from-fuchsia-400 to-fuchsia-600",X:"from-indigo-400 to-indigo-600",
  Y:"from-amber-400 to-amber-600",Z:"from-orange-400 to-orange-600",
};
const grad = (name: string) => GRADIENTS[name[0]?.toUpperCase() ?? "A"] ?? "from-zinc-400 to-zinc-600";
const initials = (name: string) => name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

function fmt(v: number) {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

const STAGE_COLORS: Record<string, string> = {
  Initial: "bg-blue-50 text-blue-700 border-blue-200/80",
  Connected: "bg-amber-50 text-amber-700 border-amber-200/80",
  Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  Closed: "bg-red-50 text-red-700 border-red-200/80",
};

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-sm animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 flex-none rounded-full bg-zinc-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 rounded bg-zinc-200" />
          <div className="h-2.5 w-16 rounded bg-zinc-100" />
        </div>
      </div>
      <div className="mt-3 h-2.5 w-full rounded bg-zinc-100" />
      <div className="mt-2 h-2.5 w-3/4 rounded bg-zinc-100" />
    </div>
  );
}

// ── Main page content ──────────────────────────────────────────────────────────
function LeadsPageContent() {
  const searchParams = useSearchParams();
  const targetLeadId = searchParams.get("leadId") || searchParams.get("id");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [stageFilter, setStageFilter] = useState<string>("All Stages");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("leads_view_mode");
      if (saved === "kanban" || saved === "table") {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  function handleSetViewMode(mode: "kanban" | "table") {
    setViewMode(mode);
    try {
      localStorage.setItem("leads_view_mode", mode);
    } catch {}
  }
  const [modalStage, setModalStage] = useState<Stage | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [channelFilter, setChannelFilter] = useState<Channel | "All">("All");
  const [serviceFilter, setServiceFilter] = useState<string>("All Services");
  const [datePreset, setDatePreset] = useState<string>("All Dates");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [pendingStage, setPendingStage] = useState<{ id: string; from: Stage; to: Stage } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewingNoteLead, setViewingNoteLead] = useState<Lead | null>(null);
  const [reminderLead, setReminderLead] = useState<Lead | null>(null);
  const [myId, setMyId] = useState<string>("");

  // ── Reminder notification state ─────────────────────────────────────────────
  type ReminderAlert = { leadId: string; leadName: string; note: string; firedAt: Date };
  const [reminderAlerts, setReminderAlerts] = useState<ReminderAlert[]>([]);
  const firedReminderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .finally(() => setLoading(false));

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user?.id) setMyId(d.user.id); })
      .catch(() => {});
  }, []);

  // Automatically open lead drawer if leadId parameter is present in URL
  useEffect(() => {
    if (targetLeadId && leads.length > 0) {
      const matched = leads.find((l) => l.id === targetLeadId);
      if (matched) {
        setEditingLead(matched);
      }
    }
  }, [targetLeadId, leads]);

  // Poll every 30s to check if any reminder has fired
  useEffect(() => {
    function checkReminders() {
      const now = Date.now();
      leads.forEach((lead) => {
        if (!lead.reminderAt) return;
        const fireTime = new Date(lead.reminderAt).getTime();
        if (fireTime <= now && !firedReminderIds.current.has(lead.id)) {
          firedReminderIds.current.add(lead.id);
          setReminderAlerts((prev) => [
            ...prev,
            { leadId: lead.id, leadName: lead.name, note: lead.notes ?? "", firedAt: new Date() },
          ]);
        }
      });
    }

    checkReminders();
    const interval = setInterval(checkReminders, 30_000);
    return () => clearInterval(interval);
  }, [leads]);

  function dismissReminder(leadId: string) {
    setReminderAlerts((prev) => prev.filter((a) => a.leadId !== leadId));
    // Clear the reminderAt on the lead so it won't fire again
    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderAt: null }),
    }).then(() => {
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, reminderAt: undefined } : l));
    });
  }

  function snoozeReminder(leadId: string) {
    // Snooze for 10 minutes
    const newTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    setReminderAlerts((prev) => prev.filter((a) => a.leadId !== leadId));
    firedReminderIds.current.delete(leadId); // allow it to fire again
    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderAt: newTime }),
    }).then(() => {
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, reminderAt: newTime } : l));
    });
  }

  async function handleAddDeal(deal: { name: string; channel: Channel; stage: Stage; phone: string; services?: string[]; notes?: string }) {
    const res = await fetch("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deal),
    });
    const data = await res.json();
    if (res.ok) { setLeads((p) => [...p, data.lead]); setModalStage(null); }
    return data;
  }

  async function handleSaveNote(leadId: string, newNote: string) {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: newNote }),
    });
    if (res.ok) {
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, notes: newNote } : l));
    }
  }

  function handleStageChange(id: string, toStage: Stage) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setPendingStage({ id, from: lead.stage, to: toStage });
  }

  async function handleDirectStageChange(id: string, newStage: Stage) {
    const prevLead = leads.find((l) => l.id === id);
    if (!prevLead || prevLead.stage === newStage) return;

    // Optimistic update
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: newStage } : l)));
    setEditingLead((prev) => (prev?.id === id ? { ...prev, stage: newStage } : prev));

    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: prevLead.stage } : l)));
      setErrorMsg(data.error ?? "Failed to update stage.");
    }
  }

  async function confirmStageChange() {
    if (!pendingStage) return;
    setConfirmLoading(true);
    const res = await fetch(`/api/leads/${pendingStage.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: pendingStage.to }),
    });
    const data = await res.json();
    setConfirmLoading(false);
    setPendingStage(null);
    if (res.ok) setLeads((p) => p.map((l) => l.id === pendingStage.id ? { ...l, stage: pendingStage.to } : l));
    else setErrorMsg(data.error ?? "Cannot move to that stage.");
  }

  async function handleDelete(id: string) {
    if (!confirm("Move this deal to trash? You can restore it later from the Trash tab.")) return;
    setLeads((p) => p.filter((l) => l.id !== id));
    setEditingLead(null);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
  }

  async function handleUpdateDeal(id: string, data: {
    name: string; stage: Stage;
    email: string; phone: string; color: string; notes: string;
    city: string; state: string; neetStatus: string;
    preferredCountry: string; preferredUniversity1: string; preferredUniversity2: string; assignAgent: string;
    ownerId: string;
    firstPayment: number; secondPayment: number; thirdPaymentAmount: number;
    otcAmount: number; totalServiceCharge: number;
  }) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok) {
      if (myId && body.lead.ownerId && body.lead.ownerId !== myId) {
        // Reassigned to another agent — it's no longer on this board.
        setLeads((p) => p.filter((l) => l.id !== id));
        setEditingLead((p) => (p?.id === id ? null : p));
      } else {
        setLeads((p) => p.map((l) => l.id === id ? { ...l, ...body.lead } : l));
        setEditingLead((p) => p?.id === id ? { ...p, ...body.lead } : p);
      }
    }
    return body;
  }

  function patchLead(id: string, patch: Partial<Lead>) {
    setLeads((p) => p.map((l) => l.id === id ? { ...l, ...patch } : l));
    setEditingLead((p) => p?.id === id ? { ...p, ...patch } : p);
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // 1. Stage Filter
      const matchStage = stageFilter === "All Stages" || l.stage === stageFilter;

      // 2. Channel Filter
      const matchChannel = channelFilter === "All" || l.channel === channelFilter;

      // 3. Service Filter
      const matchService =
        serviceFilter === "All Services" ||
        (l.services && l.services.includes(serviceFilter)) ||
        l.serviceType === serviceFilter;

      // 4. Date Range Filter
      let matchDate = true;
      if (datePreset !== "All Dates") {
        const leadTime = new Date(l.createdAt).getTime();
        const now = new Date();

        if (datePreset === "Today") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          matchDate = leadTime >= startOfToday;
        } else if (datePreset === "Last 7 Days") {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          matchDate = leadTime >= d.getTime();
        } else if (datePreset === "Last 30 Days") {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          matchDate = leadTime >= d.getTime();
        } else if (datePreset === "Custom Range") {
          if (startDate) {
            const start = new Date(startDate).getTime();
            matchDate = matchDate && leadTime >= start;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchDate = matchDate && leadTime <= end.getTime();
          }
        }
      }

      return matchStage && matchChannel && matchService && matchDate;
    });
  }, [leads, stageFilter, channelFilter, serviceFilter, datePreset, startDate, endDate]);

  const confirmedCount = filteredLeads.filter((l) => l.stage === "Confirmed").length;
  const total = filteredLeads.length;

  return (
    <div className="flex h-full flex-col gap-0">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Leads &amp; Pipeline</h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-200">
              Active CRM
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">Manage and convert enquiry leads through your 4-stage pipeline</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle: Icon-only buttons matching screenshot */}
          <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-100 p-1 shadow-2xs">
            <button
              onClick={() => handleSetViewMode("kanban")}
              className={`flex items-center justify-center rounded-lg p-2 transition-all ${
                viewMode === "kanban" ? "bg-white text-zinc-900 shadow-xs ring-1 ring-black/5" : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="Kanban View"
              aria-label="Kanban View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
            </button>
            <button
              onClick={() => handleSetViewMode("table")}
              className={`flex items-center justify-center rounded-lg p-2 transition-all ${
                viewMode === "table" ? "bg-white text-zinc-900 shadow-xs ring-1 ring-black/5" : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="List View"
              aria-label="List View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>

          <button
            onClick={() => setModalStage(STAGES[0])}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
            New Lead
          </button>
        </div>
      </div>

      {/* ── Stats + filters row ───────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Stat chips */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-2 shadow-2xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Total Enquiries</p>
              <p className="text-lg font-extrabold text-zinc-900 leading-tight mt-0.5">{loading ? "—" : total}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-2 shadow-2xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider leading-none">Confirmed</p>
              <p className="text-lg font-extrabold text-emerald-700 leading-tight mt-0.5">{loading ? "—" : confirmedCount}</p>
            </div>
          </div>
        </div>

        {/* Filters pushed to right */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Stage Dropdown Filter */}
          <div className="relative">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="appearance-none rounded-xl border border-zinc-200 bg-white pl-3.5 pr-8 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:border-zinc-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
            >
              <option value="All Stages">All Stages</option>
              {STAGES.map((stg) => (
                <option key={stg} value={stg}>{stg}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* Service Dropdown Filter */}
          <div className="relative">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="appearance-none rounded-xl border border-zinc-200 bg-white pl-3.5 pr-8 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:border-zinc-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
            >
              <option value="All Services">All Services</option>
              {SERVICES.map((svc) => (
                <option key={svc} value={svc}>{svc}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="appearance-none rounded-xl border border-zinc-200 bg-white pl-3.5 pr-8 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:border-zinc-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
              >
                <option value="All Dates">All Time</option>
                <option value="Today">Today</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Custom Range">Custom Range</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>

            {datePreset === "Custom Range" && (
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-zinc-200 shadow-2xs animate-fadeIn">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-xs text-zinc-400 font-bold">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Channel Filters (No Email) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200 shadow-2xs">
            <button onClick={() => setChannelFilter("All")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${channelFilter === "All" ? "bg-zinc-900 text-white shadow-2xs" : "text-zinc-500 hover:text-zinc-800"}`}>
              All
            </button>
            {(["WhatsApp", "Instagram", "Ads"] as const).map((c) => (
              <button key={c} onClick={() => setChannelFilter(channelFilter === c ? "All" : c)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${channelFilter === c ? "bg-zinc-900 text-white shadow-2xs" : "text-zinc-500 hover:text-zinc-800"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT (KANBAN OR TABLE VIEW) ─────────────────────────────────── */}
      {viewMode === "kanban" ? (
        /* ── Kanban board ─────────────────────────────────────────────────────── */
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1 items-start">
          {STAGES.map((stage) => {
            const meta = stageMeta[stage] ?? stageMeta["Initial"];
            const deals = filteredLeads
              .filter((l) => l.stage === stage)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return (
              <div
                key={stage}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
                onDragLeave={() => setDragOverStage((p) => (p === stage ? null : p))}
                onDrop={(e) => {
                  e.preventDefault(); setDragOverStage(null);
                  const id = e.dataTransfer.getData("text/plain") || draggingId;
                  if (id) handleStageChange(id, stage);
                  setDraggingId(null);
                }}
                className={`flex flex-1 min-w-[300px] max-w-[360px] flex-none flex-col rounded-2xl bg-zinc-100/70 p-3 transition-all duration-200 border border-zinc-200/80 ${dragOverStage === stage ? "ring-2 ring-emerald-500 bg-emerald-50/40 border-emerald-300 scale-[1.01]" : ""}`}
              >
                {/* Column header */}
                <div className="mb-3 flex items-center justify-between px-1.5 pt-1 pb-0.5 border-b border-zinc-200/60 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2.5 w-2.5 flex-none rounded-full ${meta.dot} shadow-xs`} />
                    <h2 className="truncate text-xs font-black text-zinc-800 uppercase tracking-wider">{stage}</h2>
                  </div>
                  <span className={`ml-2 flex-none rounded-full px-2.5 py-0.5 text-xs font-extrabold min-w-[22px] text-center shadow-xs ${deals.length > 0 ? meta.badge : "bg-zinc-200/80 text-zinc-600"}`}>
                    {loading ? "·" : deals.length}
                  </span>
                </div>

                {/* Cards list */}
                <div className="flex flex-1 flex-col gap-3">
                  {loading ? (
                    <>
                      <SkeletonCard />
                      <SkeletonCard />
                    </>
                  ) : deals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border border-dashed border-zinc-300/80 bg-white/50">
                      <div className={`mb-2 h-7 w-7 rounded-full ${meta.dot} opacity-20 flex items-center justify-center`} />
                      <p className="text-xs text-zinc-400 font-semibold">No enquiries in {stage}</p>
                    </div>
                  ) : (
                    deals.map((deal) => {
                      const nextStage = STAGES[STAGES.indexOf(deal.stage) + 1] as Stage | undefined;
                      const nextMeta = nextStage ? stageMeta[nextStage] : null;

                      return (
                        <div
                          key={deal.id}
                          draggable
                          onClick={() => setEditingLead(deal)}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", deal.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggingId(deal.id);
                          }}
                          onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                          className={`group relative cursor-pointer rounded-2xl border border-zinc-200/90 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 active:cursor-grabbing select-none ${cardBg(deal.color)} ${draggingId === deal.id ? "opacity-30 scale-95 rotate-1" : ""}`}
                        >
                          {/* Header: Name + Delete hover button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xl font-black text-zinc-900 leading-tight group-hover:text-emerald-800 transition-colors">
                                {deal.name}
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(deal.id); }}
                              className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                              title="Delete Lead"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            </button>
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

                          {/* Services Badges */}
                          {((deal.services && deal.services.length > 0) || deal.serviceType) && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {(deal.services && deal.services.length > 0 ? deal.services : [deal.serviceType!]).map((svc) => (
                                <span key={svc} className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800 shadow-2xs">
                                  {svc}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Time + Note Popup Trigger Button */}
                          <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                            <span className="text-[11px] text-zinc-400 font-medium">{formatRelativeTime(deal.createdAt)}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewingNoteLead(deal); }}
                              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                deal.notes
                                  ? "bg-amber-100/90 text-amber-900 border border-amber-300/80 hover:bg-amber-200 shadow-2xs"
                                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200/60"
                              }`}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/></svg>
                              {deal.notes ? "View Note" : "+ Add Note"}
                            </button>
                          </div>

                          {/* Footer: Set Reminder + Stage transition button */}
                          <div className="mt-3.5 flex items-center justify-between border-t border-zinc-100 pt-3 gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setReminderLead(deal); }}
                              className={`flex h-7 w-7 items-center justify-center rounded-xl border transition-all shadow-2xs shrink-0 ${
                                deal.reminderAt
                                  ? "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 shadow-emerald-500/20"
                                  : "bg-zinc-100 text-zinc-400 border-zinc-200/80 hover:bg-zinc-200 hover:text-zinc-700"
                              }`}
                              title={deal.reminderAt ? `Reminder active: ${new Date(deal.reminderAt).toLocaleString()}` : "Set Reminder Alert"}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            </button>

                            {nextStage ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, nextStage); }}
                                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all shadow-xs hover:shadow-md ${
                                  nextMeta ? `${nextMeta.badge} hover:opacity-95` : "bg-zinc-900 text-white"
                                }`}
                                aria-label={`Move to ${nextStage}`}
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

                {/* Add Lead in this column button */}
                {!loading && (
                  <button
                    onClick={() => setModalStage(stage)}
                    className="mt-3 flex-none flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300/80 bg-white/70 py-2.5 text-xs font-bold text-zinc-500 hover:border-emerald-500 hover:bg-emerald-50/60 hover:text-emerald-700 transition-all shadow-2xs"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                    Add Lead
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table / List view ─────────────────────────────────────────────────── */
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3.5">Lead Name</th>
                  <th className="px-5 py-3.5">Services</th>
                  <th className="px-5 py-3.5">Stage</th>
                  <th className="px-5 py-3.5">Channel</th>
                  <th className="px-5 py-3.5">Notes &amp; Reminder</th>
                  <th className="px-5 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                        <span className="text-xs font-semibold text-zinc-500">Loading enquiries...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
                        </div>
                        <p className="font-semibold text-zinc-600">No enquiries found</p>
                        <p className="text-xs text-zinc-400">Try changing your search terms or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((deal) => {
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => setEditingLead(deal)}
                        className={`transition-colors cursor-pointer group ${tableRowBg(deal.color)}`}
                      >
                        {/* Lead Name with avatar and contact number right below name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${deal.color && COLOR_AVATAR_GRADIENTS[deal.color] ? COLOR_AVATAR_GRADIENTS[deal.color] : grad(deal.name)} flex items-center justify-center text-white text-xs font-black shrink-0 shadow-2xs`}>
                              {initials(deal.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-zinc-900 leading-tight group-hover:text-emerald-700 transition-colors text-sm">
                                {deal.name}
                              </p>
                              {deal.phone ? (
                                <p className="text-xs text-zinc-500 font-medium mt-0.5 tracking-tight">
                                  {deal.phone}
                                </p>
                              ) : deal.email ? (
                                <p className="text-xs text-zinc-400 truncate max-w-[180px] mt-0.5">{deal.email}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Services */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {((deal.services && deal.services.length > 0) || deal.serviceType) ? (
                              (deal.services && deal.services.length > 0 ? deal.services : [deal.serviceType!]).map((svc) => (
                                <span key={svc} className="rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800 shadow-2xs">
                                  {svc}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-300 text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* Stage Dropdown to move to other stages */}
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-flex items-center">
                            <select
                              value={deal.stage}
                              onChange={(e) => handleDirectStageChange(deal.id, e.target.value as Stage)}
                              className={`appearance-none rounded-xl pl-3 pr-7 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs border focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
                                deal.stage === "Initial"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/80"
                                  : deal.stage === "Connected"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80"
                                  : deal.stage === "Confirmed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80"
                                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/80"
                              }`}
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s} className="bg-white text-zinc-900 font-semibold py-1">
                                  {s}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 text-current">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          </div>
                        </td>

                        {/* Channel */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold ${channelPill[deal.channel] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
                            {deal.channel}
                          </span>
                        </td>

                        {/* Notes & Reminder indicators */}
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingNoteLead(deal)}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                deal.notes
                                  ? "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                                  : "bg-zinc-50 text-zinc-400 border border-zinc-200/60 hover:text-zinc-700 hover:bg-zinc-100"
                              }`}
                              title={deal.notes ?? "Add note"}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/></svg>
                              {deal.notes ? "Note" : "+ Note"}
                            </button>

                            <button
                              onClick={() => setReminderLead(deal)}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                                deal.reminderAt
                                  ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs hover:bg-emerald-600"
                                  : "bg-zinc-50 text-zinc-400 border-zinc-200/60 hover:text-zinc-700 hover:bg-zinc-100"
                              }`}
                              title={deal.reminderAt ? `Reminder: ${new Date(deal.reminderAt).toLocaleString()}` : "Set reminder"}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            </button>
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="px-5 py-3.5 text-xs text-zinc-400 whitespace-nowrap">
                          {formatRelativeTime(deal.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {filteredLeads.length > 0 && (
              <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-3 flex items-center justify-between text-xs text-zinc-500 font-medium">
                <span>Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> enquiries</span>
                <span>Confirmed: <strong>{confirmedCount}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reminder Notification Popups ────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {reminderAlerts.map((alert) => (
          <div
            key={alert.leadId}
            className="pointer-events-auto w-96 rounded-2xl bg-white shadow-2xl border border-zinc-200/80 overflow-hidden animate-slideInRight"
            style={{ boxShadow: "0 20px 60px -10px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)" }}
          >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-none flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-600/30">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    Reminder Alert
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-zinc-900 truncate">{alert.leadName}</p>
                  {alert.note && (
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{alert.note}</p>
                  )}
                  <p className="mt-1 text-[10px] font-semibold text-zinc-400">
                    {alert.firedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </p>
                </div>
                <button
                  onClick={() => dismissReminder(alert.leadId)}
                  className="flex-none rounded-lg p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => snoozeReminder(alert.leadId)}
                  className="flex-1 rounded-xl border border-zinc-200 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  ⏰ Snooze 10 min
                </button>
                <button
                  onClick={() => {
                    dismissReminder(alert.leadId);
                    const lead = leads.find((l) => l.id === alert.leadId);
                    if (lead) setEditingLead(lead);
                  }}
                  className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  Open Lead
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {reminderLead && (
        <SetReminderModal
          leadId={reminderLead.id}
          leadName={reminderLead.name}
          onClose={() => setReminderLead(null)}
          onSaved={(reminderAt, note) => {
            setLeads((prev) => prev.map((l) => l.id === reminderLead.id ? { ...l, notes: note, reminderAt } : l));
            // Remove from fired set so it can fire when time comes
            firedReminderIds.current.delete(reminderLead.id);
          }}
        />
      )}
      {modalStage && (
        <AddDealModal stage={modalStage} onClose={() => setModalStage(null)} onSubmit={handleAddDeal} />
      )}

      {pendingStage && (
        <ConfirmStageModal
          leadName={leads.find((l) => l.id === pendingStage.id)?.name ?? ""}
          from={pendingStage.from}
          to={pendingStage.to}
          loading={confirmLoading}
          onConfirm={confirmStageChange}
          onCancel={() => setPendingStage(null)}
        />
      )}

      {errorMsg && <ErrorModal message={errorMsg} onClose={() => setErrorMsg(null)} />}

      {viewingNoteLead && (
        <ViewNoteModal
          lead={viewingNoteLead}
          onClose={() => setViewingNoteLead(null)}
          onSaveNote={handleSaveNote}
        />
      )}

      {editingLead && (
        <LeadDrawer
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSubmit={(data) => handleUpdateDeal(editingLead.id, data)}
          onDelete={() => handleDelete(editingLead.id)}
          onDocumentsChange={(docs: LeadDocument[]) => patchLead(editingLead.id, { documents: docs })}
          onProposalDocChange={(doc) => patchLead(editingLead.id, { proposalDoc: doc })}
          onRegistrationDocChange={(doc) => patchLead(editingLead.id, { registrationDoc: doc })}
          onAdmissionLetterChange={(letter) => patchLead(editingLead.id, { admissionLetter: letter })}
          onInvoicesChange={(invoices) => patchLead(editingLead.id, { invoices })}
          onOtcInvoicesChange={(otcInvoices) => patchLead(editingLead.id, { otcInvoices })}
          onInvitationLetterChange={(letter) => patchLead(editingLead.id, { invitationLetter: letter })}
          onThirdPaymentInvoicesChange={(thirdPaymentInvoices) => patchLead(editingLead.id, { thirdPaymentInvoices })}
          onVisaDocumentsChange={(visaDocuments) => patchLead(editingLead.id, { visaDocuments })}
        />
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading leads...</div>}>
      <LeadsPageContent />
    </Suspense>
  );
}

// ── Error Modal ────────────────────────────────────────────────────────────────

function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Action blocked</h3>
          <p className="text-sm text-zinc-500">{message}</p>
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Stage Modal ────────────────────────────────────────────────────────

function ConfirmStageModal({ leadName, from, to, loading, onConfirm, onCancel }: {
  leadName: string; from: Stage; to: Stage; loading: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
              <path d="M12 9v4M12 17h.01"/>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Move to next stage?</h3>
          <p className="text-sm text-zinc-500">
            This will advance <span className="font-semibold text-zinc-800">{leadName}</span> from{" "}
            <span className="font-semibold text-zinc-800">{from}</span> →{" "}
            <span className="font-semibold text-brand-600">{to}</span>.
          </p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors">
            {loading ? "Moving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
// ── View Note Modal ────────────────────────────────────────────────────────────

function ViewNoteModal({
  lead,
  onClose,
  onSaveNote,
}: {
  lead: DrawerLead;
  onClose: () => void;
  onSaveNote: (leadId: string, note: string) => Promise<void>;
}) {
  const [noteText, setNoteText] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSaveNote(lead.id, noteText);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Notes for {lead.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Enquiry notes &amp; remarks</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Enquiry Notes</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write any note for this enquiry..."
              rows={5}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors">
              {saving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Deal Modal ─────────────────────────────────────────────────────────────

// ── Add Deal Modal ─────────────────────────────────────────────────────────────

function AddDealModal({ stage, onClose, onSubmit }: {
  stage: Stage;
  onClose: () => void;
  onSubmit: (deal: {
    name: string; channel: Channel; stage: Stage; phone: string; services?: string[]; notes?: string;
  }) => Promise<{ error?: string }>;
}) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel>(CHANNELS[0]);
  const [phone, setPhone] = useState("");
  const [stageVal, setStageVal] = useState<Stage>(stage);
  const [selectedServices, setSelectedServices] = useState<string[]>(["Tours & Packages"]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleService = (svc: string) => {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    setLoading(true);
    const result = await onSubmit({
      name,
      channel,
      stage: stageVal,
      phone: cleanPhone,
      services: selectedServices,
      notes,
    });
    setLoading(false);
    if (result.error) setError(result.error);
  }

  const inputCls = "mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900">New lead</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Add a lead to your pipeline</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/></svg>
          </button>
        </div>
        {error && <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">Full name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">Phone number *</label>
            <input
              type="tel"
              required
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="e.g. 9876543210"
              className={inputCls}
            />
          </div>

          {/* Services Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Services (Select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((svc) => {
                const isSelected = selectedServices.includes(svc);
                return (
                  <label
                    key={svc}
                    className={`flex items-center gap-1.5 cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-brand-50 border-brand-500 text-brand-700"
                        : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleService(svc)}
                      className="h-3.5 w-3.5 rounded text-brand-600 focus:ring-brand-500"
                    />
                    {svc}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">Channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className={inputCls}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">Stage</label>
              <select value={stageVal} onChange={(e) => setStageVal(e.target.value as Stage)} className={inputCls}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." className={inputCls} />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors">
              {loading ? "Adding…" : "Add lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
