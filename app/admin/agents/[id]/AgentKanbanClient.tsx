"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CHANNELS, SERVICES, STAGES, type Channel, type Stage } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import LeadDrawer, { type DrawerLead } from "@/app/dashboard/leads/LeadDrawer";
import SetReminderModal from "@/app/dashboard/leads/SetReminderModal";
import ViewNoteModal, { getNoteStatus } from "@/app/dashboard/leads/ViewNoteModal";

type Lead = DrawerLead & { value: number; formNotes?: string };

type Agent = {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt: string;
};

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

const channelPill: Record<string, string> = {
  WhatsApp: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Instagram: "bg-pink-50 text-pink-700 border-pink-200",
  Facebook: "bg-blue-50 text-blue-700 border-blue-200",
  Ads:      "bg-purple-50 text-purple-700 border-purple-200",
  Email:    "bg-sky-50 text-sky-700 border-sky-200",
  "Referral/Others": "bg-amber-50 text-amber-700 border-amber-200",
};

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

function getReminderStatus(reminderAt?: string | null): {
  state: "none" | "overdue" | "duesoon" | "today" | "future";
  label: string;
  relativeText: string;
  dateText: string;
} {
  if (!reminderAt) {
    return { state: "none", label: "Set reminder", relativeText: "", dateText: "" };
  }
  const fireTime = new Date(reminderAt).getTime();
  if (isNaN(fireTime)) {
    return { state: "none", label: "Set reminder", relativeText: "", dateText: "" };
  }
  const now = Date.now();
  const diffMs = fireTime - now;

  const dateObj = new Date(reminderAt);
  const dateText = dateObj.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isToday =
    dateObj.getDate() === new Date().getDate() &&
    dateObj.getMonth() === new Date().getMonth() &&
    dateObj.getFullYear() === new Date().getFullYear();

  if (diffMs <= 0) {
    const pastMinutes = Math.floor(Math.abs(diffMs) / (60 * 1000));
    const overdueText =
      pastMinutes < 1
        ? "Due now"
        : pastMinutes < 60
        ? `${pastMinutes}m overdue`
        : pastMinutes < 1440
        ? `${Math.floor(pastMinutes / 60)}h overdue`
        : `${Math.floor(pastMinutes / 1440)}d overdue`;
    return { state: "overdue", label: overdueText, relativeText: overdueText, dateText };
  }

  const inMinutes = Math.floor(diffMs / (60 * 1000));
  if (inMinutes <= 60) {
    return { state: "duesoon", label: `Due in ${inMinutes}m`, relativeText: `In ${inMinutes}m`, dateText };
  }

  if (isToday) {
    const timeOnly = dateObj.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    return { state: "today", label: `Today ${timeOnly}`, relativeText: `Today ${timeOnly}`, dateText };
  }

  const shortDate = dateObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  const timeOnly = dateObj.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return { state: "future", label: `${shortDate}, ${timeOnly}`, relativeText: `${shortDate}, ${timeOnly}`, dateText };
}

function fmt(v: number) {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

export default function AgentKanbanClient({ agent, initialLeads }: { agent: Agent; initialLeads: Lead[] }) {
  const searchParams = useSearchParams();
  const targetLeadId = searchParams.get("leadId") || searchParams.get("id");

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("agent_leads_view_mode");
      if (saved === "kanban" || saved === "table") {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  function handleSetViewMode(mode: "kanban" | "table") {
    setViewMode(mode);
    try {
      localStorage.setItem("agent_leads_view_mode", mode);
    } catch {}
  }
  const [modalStage, setModalStage] = useState<Stage | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingNoteLead, setViewingNoteLead] = useState<Lead | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("All Stages");
  const [channelFilter, setChannelFilter] = useState<Channel | "All">("All");
  const [serviceFilter, setServiceFilter] = useState<string>("All Services");
  const [datePreset, setDatePreset] = useState<string>("All Dates");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reminderLead, setReminderLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (targetLeadId && leads.length > 0) {
      const matched = leads.find((l) => l.id === targetLeadId);
      if (matched) {
        setEditingLead(matched);
      }
    }
  }, [targetLeadId, leads]);

  const totalValue = useMemo(() => leads.reduce((s, l) => s + (l.value ?? 0), 0), [leads]);
  const confirmedCount = useMemo(() => leads.filter((l) => l.stage === "Confirmed").length, [leads]);

  const [pendingStage, setPendingStage] = useState<{ id: string; from: Stage; to: Stage } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const triggerStageChange = (id: string, toStage: Stage) => {
    const targetLead = leads.find((l) => l.id === id);
    if (!targetLead || targetLead.stage === toStage) return;

    if (toStage === "Confirmed") {
      setPendingStage({ id, from: targetLead.stage, to: toStage });
      return;
    }

    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: toStage } : l)));
    fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: toStage }),
    });
  };

  // Drag and drop handler
  const handleDrop = async (toStage: Stage) => {
    if (!draggingId) return;
    const id = draggingId;
    setDraggingId(null);
    setDragOverStage(null);
    triggerStageChange(id, toStage);
  };

  const confirmStageChange = async (revenue?: number) => {
    if (!pendingStage) return;
    setConfirmLoading(true);
    const payload: { stage: Stage; value?: number } = { stage: pendingStage.to };
    if (pendingStage.to === "Confirmed" && typeof revenue === "number") {
      payload.value = revenue;
    }
    const res = await fetch(`/api/admin/leads/${pendingStage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setConfirmLoading(false);
    setPendingStage(null);
    if (res.ok && body.lead) {
      setLeads((prev) => prev.map((l) => (l.id === body.lead.id ? { ...l, ...body.lead } : l)));
      setEditingLead((prev) => (prev?.id === body.lead.id ? { ...prev, ...body.lead } : prev));
    }
  };

  async function handleAddDeal(deal: { name: string; channel: Channel; stage: Stage; phone: string; services?: string[]; notes?: string }) {
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...deal,
        ownerId: agent.id,
        assignAgent: agent.name,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setLeads((prev) => [data.lead, ...prev]);
      setModalStage(null);
    }
    return data;
  }

  async function handleDelete(id: string) {
    if (!confirm("Move this lead to trash?")) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setEditingLead(null);
    await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
  }

  async function handleUpdateLead(data: any) {
    if (!editingLead) return { error: "No lead selected." };
    const res = await fetch(`/api/admin/leads/${editingLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok && body.lead) {
      setLeads((prev) => prev.map((l) => l.id === body.lead.id ? { ...l, ...body.lead } : l));
      setEditingLead((prev) => prev?.id === body.lead.id ? { ...prev, ...body.lead } : prev);
    }
    return body;
  }

  function patchLead(id: string, patch: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setEditingLead((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }

  async function handleSaveNote(leadId: string, note: string, formNote?: string) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, notes: note, ...(formNote !== undefined ? { formNotes: formNote } : {}) }
          : l
      )
    );
    if (editingLead && editingLead.id === leadId) {
      setEditingLead((prev) =>
        prev
          ? { ...prev, notes: note, ...(formNote !== undefined ? { formNotes: formNote } : {}) }
          : null
      );
    }
    await fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: note,
        ...(formNote !== undefined ? { formNotes: formNote } : {}),
      }),
    });
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchStage = stageFilter === "All Stages" || l.stage === stageFilter;
      const matchChannel = channelFilter === "All" || l.channel === channelFilter;
      const matchService =
        serviceFilter === "All Services" ||
        (l.services && l.services.includes(serviceFilter)) ||
        l.serviceType === serviceFilter;

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
    }).sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [leads, stageFilter, channelFilter, serviceFilter, datePreset, startDate, endDate, sortOrder]);

  return (
    <div className="space-y-6">
      {/* ── Top Header Row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin/agents" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Users List
        </Link>

        <button
          onClick={() => setModalStage("Initial")}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
          Add Lead for {agent.name.split(" ")[0]}
        </button>
      </div>

      {/* ── Agent Banner ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br ${grad(agent.name)} text-lg font-black text-white shadow-md`}>
            {initials(agent.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-zinc-900">{agent.name}</h1>
              <span className="rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-0.5 text-[10px] font-bold">
                User Pipeline
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{agent.email} · {agent.company}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Joined {new Date(agent.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>

        {/* Stats Pill Badges */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 px-4 py-2 text-center">
            <p className="text-lg font-black text-zinc-900">{leads.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Leads</p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-2 text-center">
            <p className="text-lg font-black text-emerald-800">{fmt(totalValue)}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Pipeline Value</p>
          </div>
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 px-4 py-2 text-center">
            <p className="text-lg font-black text-blue-800">{confirmedCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Confirmed</p>
          </div>

          {/* View mode toggle */}
          <div className="ml-2 flex items-center rounded-xl border border-zinc-200 bg-zinc-100 p-1">
            <button
              onClick={() => handleSetViewMode("kanban")}
              className={`flex items-center justify-center rounded-lg p-2 transition-colors ${
                viewMode === "kanban" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="Kanban View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
            </button>
            <button
              onClick={() => handleSetViewMode("table")}
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

      {/* ── Filters Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <div className="relative">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="appearance-none rounded-xl border border-zinc-200 bg-white pl-3.5 pr-8 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:border-zinc-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
            >
              <option value="All Stages">All Stages</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* Service Filter */}
          <div className="relative">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="appearance-none rounded-xl border border-zinc-200 bg-white pl-3.5 pr-8 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:border-zinc-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
            >
              <option value="All Services">All Services</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* Date Filter */}
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

          {/* Channel Filters */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200 shadow-2xs">
            <button
              onClick={() => setChannelFilter("All")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                channelFilter === "All" ? "bg-zinc-900 text-white shadow-2xs" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              All
            </button>
            {CHANNELS.map((c) => (
              <button
                key={c}
                onClick={() => setChannelFilter(c)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  channelFilter === c ? "bg-zinc-900 text-white shadow-2xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KANBAN VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1 items-start">
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
                className={`flex flex-1 min-w-[290px] max-w-[360px] flex-none flex-col rounded-2xl border bg-zinc-50/50 p-4 transition-all ${
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

                          {/* Revenue */}
                          {deal.value > 0 && (
                            <div className="mt-2 flex items-center">
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-300/80 px-2 py-0.5 text-xs font-black text-emerald-800 shadow-2xs">
                                <span>₹</span>{deal.value.toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}

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
                            {(() => {
                              const noteStatus = getNoteStatus(deal.notes, deal.formNotes);
                              return (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setViewingNoteLead(deal); }}
                                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                    noteStatus.hasAnyNote
                                      ? "bg-amber-100/90 text-amber-900 border border-amber-300/80 shadow-2xs hover:bg-amber-200"
                                      : "bg-zinc-100 text-zinc-600 border border-zinc-200/60 hover:bg-zinc-200 hover:text-zinc-900"
                                  }`}
                                  title={noteStatus.hasAnyNote ? "View Note" : "Add note"}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/></svg>
                                  {noteStatus.kanbanLabel}
                                </button>
                              );
                            })()}
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
                                onClick={(e) => { e.stopPropagation(); triggerStageChange(deal.id, nextStage); }}
                                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all shadow-xs hover:shadow-md ${
                                  nextMeta ? `${nextMeta.badge} hover:opacity-95` : "bg-zinc-900 text-white"
                                }`}
                              >
                                Move Next
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
                  onClick={() => setModalStage(stage)}
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
        /* ── TABLE / LIST VIEW ─────────────────────────────────────────────── */
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
                  <th
                    className="px-5 py-3.5 cursor-pointer select-none hover:text-zinc-700 transition-colors"
                    onClick={() => setSortOrder((p) => (p === "desc" ? "asc" : "desc"))}
                    title={`Sort by Created Date (${sortOrder === "desc" ? "showing newest first" : "showing oldest first"})`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Created</span>
                      <span className={`transition-transform text-xs font-bold ${sortOrder === "desc" ? "text-emerald-600" : "text-amber-600"}`}>
                        {sortOrder === "desc" ? "↓" : "↑"}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredLeads.length === 0 ? (
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
                  filteredLeads.map((deal) => (
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
                            onChange={(e) => triggerStageChange(deal.id, e.target.value as Stage)}
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
                          {(() => {
                            const noteStatus = getNoteStatus(deal.notes, deal.formNotes);
                            return (
                              <button
                                onClick={() => setViewingNoteLead(deal)}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                  noteStatus.hasAnyNote
                                    ? "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 shadow-2xs"
                                    : "bg-zinc-50 text-zinc-400 border border-zinc-200/60 hover:text-zinc-700 hover:bg-zinc-100"
                                }`}
                                title={noteStatus.hasAnyNote ? "View Note" : "Add note"}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/></svg>
                                {noteStatus.tableLabel}
                              </button>
                            );
                          })()}

                          {(() => {
                            const remStatus = getReminderStatus(deal.reminderAt);
                            return (
                              <button
                                onClick={() => setReminderLead(deal)}
                                className={`relative flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                                  remStatus.state === "overdue"
                                    ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 shadow-2xs"
                                    : remStatus.state === "duesoon"
                                    ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 shadow-2xs"
                                    : remStatus.state === "today"
                                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                    : remStatus.state === "future"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                                    : "bg-zinc-50 text-zinc-400 border-zinc-200/60 hover:text-zinc-700 hover:bg-zinc-100"
                                }`}
                                title={
                                  remStatus.state === "overdue"
                                    ? `Overdue (${remStatus.label}): ${remStatus.dateText}`
                                    : remStatus.state === "duesoon" || remStatus.state === "today"
                                    ? `Due today: ${remStatus.dateText}`
                                    : remStatus.state === "future"
                                    ? `Reminder: ${remStatus.dateText}`
                                    : "Set reminder"
                                }
                                aria-label={deal.reminderAt ? `Reminder: ${remStatus.label}` : "Set reminder"}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                </svg>
                                {remStatus.state === "overdue" && (
                                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 ring-2 ring-white" />
                                  </span>
                                )}
                                {remStatus.state === "duesoon" && (
                                  <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
                                )}
                                {remStatus.state === "today" && (
                                  <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white" />
                                )}
                                {remStatus.state === "future" && (
                                  <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="px-5 py-3.5 text-xs text-zinc-400 whitespace-nowrap">
                        {formatRelativeTime(deal.createdAt)}
                      </td>
                    </tr>
                  ))
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

      {/* ── MODALS & DRAWER ─────────────────────────────────────────────────── */}
      {viewingNoteLead && (
        <ViewNoteModal
          lead={viewingNoteLead}
          onClose={() => setViewingNoteLead(null)}
          onSaveNote={handleSaveNote}
        />
      )}
      {modalStage && (
        <AddDealModal stage={modalStage} agentName={agent.name} onClose={() => setModalStage(null)} onSubmit={handleAddDeal} />
      )}

      {reminderLead && (
        <SetReminderModal
          leadId={reminderLead.id}
          leadName={reminderLead.name}
          initialReminderAt={reminderLead.reminderAt}
          initialNote={reminderLead.notes}
          onClose={() => setReminderLead(null)}
          onSaved={(reminderAt, note) => {
            setLeads((prev) => prev.map((l) => (l.id === reminderLead.id ? { ...l, notes: note, reminderAt } : l)));
          }}
          onCleared={() => {
            setLeads((prev) => prev.map((l) => (l.id === reminderLead.id ? { ...l, reminderAt: undefined } : l)));
          }}
        />
      )}

      {/* ── Confirm Stage Modal ────────────────────────────────────────────── */}
      {pendingStage && (
        <ConfirmStageModal
          leadName={leads.find((l) => l.id === pendingStage.id)?.name ?? ""}
          from={pendingStage.from}
          to={pendingStage.to}
          initialValue={leads.find((l) => l.id === pendingStage.id)?.value}
          loading={confirmLoading}
          onConfirm={(revenue) => confirmStageChange(revenue)}
          onCancel={() => setPendingStage(null)}
        />
      )}

      {editingLead && (
        <LeadDrawer
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSubmit={handleUpdateLead}
          onDelete={() => handleDelete(editingLead.id)}
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

// ── Local Add Deal Modal ───────────────────────────────────────────────────────
function AddDealModal({
  stage,
  agentName,
  onClose,
  onSubmit,
}: {
  stage: Stage;
  agentName: string;
  onClose: () => void;
  onSubmit: (deal: { name: string; channel: Channel; stage: Stage; phone: string; services?: string[]; notes?: string }) => Promise<{ error?: string }>;
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
    if (result?.error) setError(result.error);
  }

  const inputCls = "mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900">New Lead for {agentName}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Directly assign a lead to this branch</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/></svg>
          </button>
        </div>
        {error && <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">Full name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">Phone number</label>
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

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">Services Required</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SERVICES.map((svc) => {
                const isSelected = selectedServices.includes(svc);
                return (
                  <label
                    key={svc}
                    className={`flex items-center gap-1.5 cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                        : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleService(svc)}
                      className="h-3.5 w-3.5 rounded text-emerald-600 focus:ring-emerald-500"
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

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-xs">
              {loading ? "Adding…" : "Add lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Stage Modal ────────────────────────────────────────────────────────

function ConfirmStageModal({
  leadName, from, to, initialValue = 0, loading, onConfirm, onCancel,
}: {
  leadName: string; from: Stage; to: Stage; initialValue?: number; loading: boolean;
  onConfirm: (revenue?: number) => void; onCancel: () => void;
}) {
  const [revenue, setRevenue] = useState<number | "">(initialValue > 0 ? initialValue : "");
  const isConfirmed = to === "Confirmed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full mb-3 ${isConfirmed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
            {isConfirmed ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01"/>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <h3 className="text-base font-bold text-zinc-900 mb-1">
            {isConfirmed ? "Deal Confirmed! 🎉" : "Move to next stage?"}
          </h3>
          <p className="text-sm text-zinc-500">
            {isConfirmed ? (
              <>
                Advance <span className="font-semibold text-zinc-800">{leadName}</span> to{" "}
                <span className="font-semibold text-emerald-600">Confirmed</span>. Enter the confirmed revenue for this deal below:
              </>
            ) : (
              <>
                This will advance <span className="font-semibold text-zinc-800">{leadName}</span> from{" "}
                <span className="font-semibold text-zinc-800">{from}</span> →{" "}
                <span className="font-semibold text-brand-600">{to}</span>.
              </>
            )}
          </p>

          {isConfirmed && (
            <div className="mt-4">
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Deal Revenue (₹)
              </label>
              <div className="relative flex items-center rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                <span className="text-base font-bold text-zinc-400 mr-2 select-none">₹</span>
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value === "" ? "" : Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      e.preventDefault();
                      onConfirm(revenue === "" ? 0 : Number(revenue));
                    }
                  }}
                  placeholder="e.g. 50000"
                  className="w-full bg-transparent text-base font-bold text-zinc-900 outline-none placeholder:text-zinc-400 [appearance:textfield]"
                />
              </div>
              {typeof revenue === "number" && revenue > 0 && (
                <p className="mt-1.5 text-xs font-semibold text-emerald-600">
                  ₹{revenue.toLocaleString("en-IN")}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(isConfirmed ? (revenue === "" ? 0 : Number(revenue)) : undefined)}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              isConfirmed ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {loading ? "Moving…" : isConfirmed ? "Confirm Deal" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
