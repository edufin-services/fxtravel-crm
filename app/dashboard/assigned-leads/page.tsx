"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CHANNELS, SERVICES, STAGES, type Channel, type Stage } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import LeadDrawer, { type DrawerLead, type LeadDocument, type LeadUpdate } from "../leads/LeadDrawer";
import SetReminderModal from "../leads/SetReminderModal";
import ViewNoteModal, { getNoteStatus } from "../leads/ViewNoteModal";
import ExportLeadsButton from "@/app/components/ExportLeadsButton";

type Lead = DrawerLead & { value: number };

const STAGE_LABELS: Record<Stage, string> = {
  Initial: "INITIAL",
  Connected: "CONNECTED",
  Confirmed: "COMPLETED (WON)",
  Closed: "CLOSED (LOST)",
};

const stageMeta: Record<string, { dot: string; border: string; badge: string; text: string }> = {
  Initial:   { dot: "bg-blue-500",   border: "border-t-blue-400",   badge: "bg-blue-600 text-white",    text: "text-blue-600" },
  Connected: { dot: "bg-amber-500",  border: "border-t-amber-400",  badge: "bg-amber-600 text-white",   text: "text-amber-600" },
  Confirmed: { dot: "bg-emerald-500",border: "border-t-emerald-400",badge: "bg-emerald-600 text-white", text: "text-emerald-600" },
  Closed:    { dot: "bg-red-500",    border: "border-t-red-400",    badge: "bg-zinc-400 text-white",    text: "text-zinc-500" },
};

const TRAVEL_SERVICES = [
  "Domestic Tours",
  "International Tours",
  "Flights/Hotels",
  "Others",
];

const LEAD_COLORS = [
  { value: "",        bg: "bg-white",          border: "border-zinc-200/90" },
  { value: "sky",     bg: "bg-[#0284c7]",      border: "border-[#0369a1]" },
  { value: "emerald", bg: "bg-[#059669]",      border: "border-[#047857]" },
  { value: "amber",   bg: "bg-[#d97706]",      border: "border-[#b45309]" },
  { value: "violet",  bg: "bg-[#7c3aed]",      border: "border-[#6d28d9]" },
  { value: "rose",    bg: "bg-[#e11d48]",      border: "border-[#be123c]" },
  { value: "orange",  bg: "bg-[#ea580c]",      border: "border-[#c2410c]" },
];

function isColoredCard(color?: string): boolean {
  return Boolean(color && color !== "");
}

function cardBg(color?: string) {
  const c = LEAD_COLORS.find((x) => x.value === (color ?? "")) ?? LEAD_COLORS[0];
  if (c.value === "") {
    return "bg-white border-zinc-200/90 text-zinc-900 shadow-2xs hover:shadow-md";
  }
  return `${c.bg} ${c.border} text-white shadow-md shadow-zinc-900/10`;
}

function ChannelIcon({ channel, className = "h-3.5 w-3.5" }: { channel: Channel; className?: string }) {
  switch (channel) {
    case "WhatsApp":
      return (
        <svg className={`${className} text-emerald-600`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      );
    case "Instagram":
      return (
        <svg className={`${className} text-pink-600`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      );
    case "Facebook":
      return (
        <svg className={`${className} text-blue-600`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
      );
    case "Ads":
      return (
        <svg className={`${className} text-purple-600`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      );
    case "Email":
      return (
        <svg className={`${className} text-amber-600`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
      );
    default:
      return (
        <svg className={`${className} text-zinc-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      );
  }
}

function getAssignerInfo(deal: Lead) {
  const fromName = deal.assignedFromUserName?.trim();
  const byName = deal.assignedByUserName?.trim();

  // If there is a specific previous user it was assigned from:
  if (fromName && fromName.toLowerCase() !== "admin") {
    const viaAdmin = Boolean(byName && byName.toLowerCase() === "admin");
    return {
      sourceName: fromName,
      viaAdmin,
      isFromAdmin: false,
      fullTooltip: `Assigned from ${fromName}${byName ? ` by ${byName}` : ""}`,
      tableLabel: `From ${fromName}${viaAdmin ? " (Admin)" : ""}`,
    };
  }

  // If assigned directly by a team member:
  if (byName && byName.toLowerCase() !== "admin") {
    return {
      sourceName: byName,
      viaAdmin: false,
      isFromAdmin: false,
      fullTooltip: `Assigned by ${byName}`,
      tableLabel: `From ${byName}`,
    };
  }

  // Default: Assigned directly by Admin
  return {
    sourceName: "Admin",
    viaAdmin: false,
    isFromAdmin: true,
    fullTooltip: "Assigned by Admin",
    tableLabel: "Admin",
  };
}

function AssignedLeadsContent() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string>("");

  // Views & UI
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("All Stages");
  const [channelFilter, setChannelFilter] = useState<string>("All");
  const [assignerFilter, setAssignerFilter] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Interaction Modals
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingNoteLead, setViewingNoteLead] = useState<Lead | null>(null);
  const [reminderLead, setReminderLead] = useState<Lead | null>(null);
  const [pendingStage, setPendingStage] = useState<{ id: string; from: Stage; to: Stage } | null>(null);
  const [confirmValue, setConfirmValue] = useState<string>("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Load Current User & Assigned Leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsRes, userRes] = await Promise.all([
        fetch("/api/leads/assigned"),
        fetch("/api/user/profile"),
      ]);

      if (userRes.ok) {
        const uData = await userRes.json();
        if (uData.user?.id) setMyId(uData.user.id);
      }

      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error("Failed to load assigned leads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Deep-link support: ?leadId=xxx
  useEffect(() => {
    const leadIdParam = searchParams.get("leadId");
    if (leadIdParam && leads.length > 0) {
      const target = leads.find((l) => l.id === leadIdParam);
      if (target) setEditingLead(target);
    }
  }, [searchParams, leads]);

  // Dynamic Assigner list from leads
  const availableAssigners = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      const fromName = l.assignedFromUserName?.trim();
      const byName = l.assignedByUserName?.trim();
      if (fromName && fromName.toLowerCase() !== "admin") set.add(fromName);
      if (byName && byName.toLowerCase() !== "admin") set.add(byName);
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter((l) => {
        if (stageFilter !== "All Stages" && l.stage !== stageFilter) return false;
        if (channelFilter !== "All" && l.channel !== channelFilter) return false;
        if (assignerFilter !== "All") {
          const fromName = l.assignedFromUserName?.trim().toLowerCase() || "";
          const byName = l.assignedByUserName?.trim().toLowerCase() || "admin";
          const target = assignerFilter.toLowerCase();
          if (target === "admin") {
            if (byName !== "admin" && !byName.includes("admin")) return false;
          } else {
            if (fromName !== target && byName !== target) return false;
          }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = l.name.toLowerCase().includes(q);
          const matchPhone = Boolean(l.phone && l.phone.includes(q));
          const matchEmail = Boolean(l.email && l.email.toLowerCase().includes(q));
          const matchAssigner = Boolean(
            (l.assignedByUserName && l.assignedByUserName.toLowerCase().includes(q)) ||
            (l.assignedFromUserName && l.assignedFromUserName.toLowerCase().includes(q))
          );
          if (!matchName && !matchPhone && !matchEmail && !matchAssigner) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [leads, stageFilter, channelFilter, assignerFilter, searchQuery, sortOrder]);

  // Lead Counts & Stats
  const totalCount = leads.length;
  const fromAdminCount = leads.filter((l) => {
    const fromName = (l.assignedFromUserName || "").toLowerCase();
    const byName = (l.assignedByUserName || "").toLowerCase();
    return (!fromName || fromName === "admin") && (!byName || byName === "admin");
  }).length;
  const fromTeamCount = totalCount - fromAdminCount;
  const initialCount = leads.filter((l) => l.stage === "Initial").length;
  const confirmedCount = leads.filter((l) => l.stage === "Confirmed").length;

  // Handlers
  async function handleUpdateLead(id: string, data: LeadUpdate) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok) {
      if (myId && body.lead.ownerId && body.lead.ownerId !== myId) {
        // Transferred out of current user
        setLeads((prev) => prev.filter((l) => l.id !== id));
        setEditingLead(null);
      } else {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...body.lead } : l)));
        setEditingLead((prev) => (prev?.id === id ? { ...prev, ...body.lead } : prev));
      }
    }
    return body;
  }

  function patchLead(id: string, patch: Partial<Lead>) {
    setLeads((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setEditingLead((p) => (p?.id === id ? { ...p, ...patch } : p));
  }

  async function handleDelete(id: string) {
    if (!confirm("Move this deal to trash? You can restore it later from the Trash tab.")) return;
    setLeads((p) => p.filter((l) => l.id !== id));
    setEditingLead(null);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
  }

  async function handleDirectStageChange(id: string, newStage: Stage) {
    const prevLead = leads.find((l) => l.id === id);
    if (!prevLead || prevLead.stage === newStage) return;

    if (newStage === "Confirmed") {
      setPendingStage({ id, from: prevLead.stage, to: newStage });
      setConfirmValue(String(prevLead.value || ""));
      return;
    }

    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: newStage } : l)));
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
    const payload: { stage: Stage; value?: number } = { stage: pendingStage.to };
    if (pendingStage.to === "Confirmed" && confirmValue !== "") {
      payload.value = Number(confirmValue) || 0;
    }

    const res = await fetch(`/api/leads/${pendingStage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setConfirmLoading(false);
    setPendingStage(null);

    if (res.ok) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === pendingStage.id
            ? { ...l, stage: pendingStage.to, ...(payload.value !== undefined ? { value: payload.value } : {}) }
            : l
        )
      );
    } else {
      setErrorMsg(data.error ?? "Cannot move to that stage.");
    }
  }

  async function handleSaveNote(leadId: string, newNote: string, newFormNote?: string) {
    const payload: Record<string, string> = { notes: newNote };
    if (newFormNote !== undefined) payload.formNotes = newFormNote;
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, notes: newNote, ...(newFormNote !== undefined ? { formNotes: newFormNote } : {}) }
            : l
        )
      );
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-xs">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">Assigned Leads</h1>
              <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-black">
                {totalCount}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Newly assigned leads transferred from administrators and team members
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View mode toggle */}
          <div className="flex items-center rounded-xl border border-zinc-200/90 bg-zinc-100/80 p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === "kanban" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="18" rx="1.5" /><rect x="14" y="3" width="7" height="18" rx="1.5" />
              </svg>
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === "table" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <span>Table</span>
            </button>
          </div>

          <ExportLeadsButton
            filteredLeads={filteredLeads}
            allLeads={leads}
            fileNamePrefix="Assigned_Leads"
          />

          <button
            onClick={fetchLeads}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 shadow-2xs transition-colors"
            title="Refresh assigned leads"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={loading ? "animate-spin" : ""}>
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Stat Chips ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-2.5 shadow-2xs">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">TOTAL ASSIGNED</p>
            <p className="text-xl font-black text-zinc-900">{loading ? "—" : totalCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/40 px-4 py-2.5 shadow-2xs">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider">FROM ADMIN</p>
            <p className="text-xl font-black text-rose-800">{loading ? "—" : fromAdminCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/40 px-4 py-2.5 shadow-2xs">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">FROM TEAM</p>
            <p className="text-xl font-black text-indigo-800">{loading ? "—" : fromTeamCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-2.5 shadow-2xs">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">INITIAL (NEW)</p>
            <p className="text-xl font-black text-emerald-800">{loading ? "—" : initialCount}</p>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200/90 shadow-2xs">
        <div className="flex flex-1 items-center gap-2.5 min-w-[240px]">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search assigned leads by name, phone, or assigner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50/70 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all placeholder:text-zinc-400"
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs p-0.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Assigner filter */}
          <select
            value={assignerFilter}
            onChange={(e) => setAssignerFilter(e.target.value)}
            className="text-xs font-semibold rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-700 hover:border-zinc-300 focus:border-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="All">All Assigners</option>
            <option value="Admin">Admin</option>
            {availableAssigners.filter((a) => a.toLowerCase() !== "admin").map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs font-semibold rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-700 hover:border-zinc-300 focus:border-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="All Stages">All Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s] || s}</option>
            ))}
          </select>

          {/* Channel filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs font-semibold rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-700 hover:border-zinc-300 focus:border-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="All">All Channels</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder((p) => (p === "desc" ? "asc" : "desc"))}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            title={`Sort by Assignment Date: ${sortOrder === "desc" ? "Newest First" : "Oldest First"}`}
          >
            <span>Date</span>
            <span className="font-bold text-emerald-600">{sortOrder === "desc" ? "↓ Newest" : "↑ Oldest"}</span>
          </button>
        </div>
      </div>

      {/* ── Main View Content ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <svg className="h-6 w-6 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs font-semibold">Loading assigned leads...</span>
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 mb-3 shadow-2xs">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-zinc-900">No Assigned Leads Found</h3>
          <p className="text-xs text-zinc-500 max-w-md mt-1 mb-4">
            {leads.length === 0
              ? "You do not have any leads assigned to you from administrators or team members yet. When an admin or team member assigns a lead to you, it will show up here at the top with today's date."
              : "No assigned leads match the currently selected search and filter criteria."}
          </p>
          {leads.length > 0 && (
            <button
              onClick={() => { setSearchQuery(""); setStageFilter("All Stages"); setChannelFilter("All"); setAssignerFilter("All"); }}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : viewMode === "kanban" ? (
        /* ── Kanban View ─────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === stage);
            const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);
            const meta = stageMeta[stage];
            const isDropTarget = dragOverStage === stage;

            return (
              <div
                key={stage}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const leadId = e.dataTransfer.getData("text/plain");
                  if (leadId) handleDirectStageChange(leadId, stage);
                }}
                className={`flex flex-col rounded-2xl border bg-zinc-50/70 p-3 min-h-[500px] transition-all duration-150 ${
                  isDropTarget ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-200" : "border-zinc-200/80"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-200/80">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                    <span className="text-xs font-bold text-zinc-900 tracking-wide">{STAGE_LABELS[stage] || stage}</span>
                    <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                      {stageLeads.length}
                    </span>
                  </div>
                  {stageValue > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      ₹{stageValue.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {/* Cards Container */}
                <div className="flex flex-col gap-2.5 flex-1">
                  {stageLeads.map((deal) => {
                    const isColored = isColoredCard(deal.color);
                    const noteStatus = getNoteStatus(deal.notes, deal.formNotes);
                    const assignerInfo = getAssignerInfo(deal);
                    const isNewInInitial = deal.stage === "Initial";

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
                        className={`group relative cursor-pointer rounded-2xl border p-3.5 transition-all duration-150 hover:-translate-y-0.5 active:cursor-grabbing select-none shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-md ${cardBg(deal.color)} ${
                          draggingId === deal.id ? "opacity-30 scale-95" : ""
                        }`}
                      >
                        {/* Top Transfer Attribution Bar */}
                        <div
                          className={`flex items-center justify-between gap-1.5 pb-2 mb-2.5 border-b min-w-0 ${
                            isColored ? "border-white/20" : "border-zinc-100"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {/* Assigner Avatar Circle */}
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black uppercase ${
                                isColored
                                  ? "bg-white/20 text-white"
                                  : assignerInfo.isFromAdmin
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-indigo-100 text-indigo-700"
                              }`}
                              title={assignerInfo.fullTooltip}
                            >
                              {assignerInfo.sourceName.charAt(0) || "A"}
                            </div>

                            {/* Assigner Attribution */}
                            <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                              <span
                                className={`text-[10px] font-medium shrink-0 ${
                                  isColored ? "text-white/70" : "text-zinc-400"
                                }`}
                              >
                                From
                              </span>
                              <span
                                className={`text-[11px] font-bold truncate ${
                                  isColored ? "text-white" : "text-zinc-800"
                                }`}
                                title={assignerInfo.fullTooltip}
                              >
                                {assignerInfo.sourceName}
                              </span>
                              {assignerInfo.viaAdmin && (
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.2 text-[8.5px] font-bold uppercase tracking-tight ${
                                    isColored
                                      ? "bg-white/20 text-white"
                                      : "bg-zinc-100 text-zinc-500 border border-zinc-200/80"
                                  }`}
                                  title="Assigned via Administrator"
                                >
                                  Admin
                                </span>
                              )}
                            </div>
                          </div>

                          {/* NEW Badge */}
                          {isNewInInitial && (
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider uppercase ${
                                isColored
                                  ? "bg-white text-emerald-800 shadow-2xs"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              NEW
                            </span>
                          )}
                        </div>

                        {/* Row 1: Name + Date */}
                        <div className="flex items-start justify-between gap-1.5">
                          <p className={`truncate text-[13px] font-bold leading-snug ${isColored ? "text-white" : "text-zinc-900 group-hover:text-emerald-700 transition-colors"}`}>
                            {deal.name}
                          </p>
                          <span className={`text-[10px] font-medium shrink-0 ${isColored ? "text-white/80" : "text-zinc-400"}`}>
                            {formatRelativeTime(deal.createdAt)}
                          </span>
                        </div>

                        {/* Row 2: Phone */}
                        {deal.phone && (
                          <div className={`mt-1 flex items-center gap-1.5 text-[11px] font-medium ${isColored ? "text-white/90" : "text-zinc-600"}`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-zinc-400 shrink-0">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.9.36 1.84.58 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round"/>
                            </svg>
                            <span className="truncate">{deal.phone}</span>
                          </div>
                        )}

                        {/* Badges: Channel & Services */}
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center justify-center shrink-0" title={deal.channel}>
                            <ChannelIcon channel={deal.channel} className="h-3.5 w-3.5" />
                          </span>

                          {Array.isArray(deal.services) && deal.services.map((svc) => (
                            <span
                              key={svc}
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                                isColored
                                  ? "bg-white text-[#0369a1] border-white/60 shadow-2xs"
                                  : "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]"
                              }`}
                            >
                              {svc}
                            </span>
                          ))}

                          {deal.value > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>₹</span>{deal.value.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>

                        {/* Card Footer: Buttons */}
                        <div className={`mt-2.5 flex items-center justify-between gap-1 pt-2 border-t ${isColored ? "border-white/20" : "border-zinc-100"}`}>
                          <div className="flex items-center gap-1">
                            {/* Reminder */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setReminderLead(deal); }}
                              className="relative flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 transition-all"
                              title="Set reminder"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                              </svg>
                            </button>

                            {/* Note */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewingNoteLead(deal); }}
                              className={`relative flex h-6.5 w-6.5 items-center justify-center rounded-lg border transition-all ${
                                noteStatus.hasAnyNote
                                  ? "bg-[#fbbf24] text-zinc-900 border-[#f59e0b] shadow-2xs font-bold"
                                  : "bg-white text-zinc-400 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-600"
                              }`}
                              title={noteStatus.hasAnyNote ? "View Note" : "Add note"}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/>
                              </svg>
                            </button>
                          </div>

                          {/* Move next stage button */}
                          {stage === "Initial" ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDirectStageChange(deal.id, "Connected"); }}
                              className="flex items-center gap-1 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition-all active:scale-95"
                            >
                              <span>Move next</span>
                              <span>➔</span>
                            </button>
                          ) : stage === "Connected" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingStage({ id: deal.id, from: stage, to: "Confirmed" });
                                setConfirmValue(String(deal.value || ""));
                              }}
                              className="flex items-center gap-1 rounded-lg bg-[#059669] hover:bg-[#047857] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition-all active:scale-95"
                            >
                              <span>Move next</span>
                              <span>➔</span>
                            </button>
                          ) : stage === "Confirmed" ? (
                            <span className="flex items-center gap-1 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 text-[11px] font-bold text-[#059669]">
                              ✓ Won
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-600">
                              Closed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table / List View ───────────────────────────────────────────────── */
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3.5">Lead Name</th>
                  <th className="px-5 py-3.5">Assigned From</th>
                  <th className="px-5 py-3.5">Stage</th>
                  <th className="px-5 py-3.5 text-center">Channel</th>
                  <th className="px-5 py-3.5">Services</th>
                  <th
                    className="px-5 py-3.5 cursor-pointer select-none hover:text-zinc-700 transition-colors"
                    onClick={() => setSortOrder((p) => (p === "desc" ? "asc" : "desc"))}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Assigned Date</span>
                      <span className="text-emerald-600 font-bold">{sortOrder === "desc" ? "↓" : "↑"}</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredLeads.map((deal) => {
                  const assignerInfo = getAssignerInfo(deal);
                  const noteStatus = getNoteStatus(deal.notes, deal.formNotes);

                  return (
                    <tr
                      key={deal.id}
                      onClick={() => setEditingLead(deal)}
                      className="hover:bg-zinc-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-zinc-900">{deal.name}</p>
                          {deal.stage === "Initial" && (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
                              New
                            </span>
                          )}
                        </div>
                        {deal.phone && (
                          <p className="text-xs text-zinc-400 mt-0.5">{deal.phone}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border ${
                            assignerInfo.isFromAdmin
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          }`}
                          title={assignerInfo.fullTooltip}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 opacity-70">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                          </svg>
                          <span>{assignerInfo.tableLabel}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold`}>
                          <span className={`h-2 w-2 rounded-full ${stageMeta[deal.stage]?.dot ?? "bg-zinc-400"}`} />
                          <span>{STAGE_LABELS[deal.stage] || deal.stage}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center">
                          <ChannelIcon channel={deal.channel} />
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(deal.services) && deal.services.slice(0, 2).map((s) => (
                            <span key={s} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-zinc-500">
                        {formatRelativeTime(deal.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingNoteLead(deal)}
                            className={`p-1.5 rounded-lg border ${
                              noteStatus.hasAnyNote
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "text-zinc-400 border-zinc-200 hover:bg-zinc-50"
                            }`}
                            title="Notes"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/></svg>
                          </button>
                          <button
                            onClick={() => setEditingLead(deal)}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold transition-colors"
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Confirm Won Stage Modal ─────────────────────────────────────────── */}
      {pendingStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80 p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900">Move to Confirmed</h3>
            <p className="text-xs text-zinc-500">
              Confirm deal value for this lead before moving to Confirmed (Won):
            </p>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Deal Value (₹)</label>
              <input
                type="number"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingStage(null)}
                className="flex-1 rounded-xl border border-zinc-200 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={confirmStageChange}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-bold text-white transition-all disabled:opacity-50"
              >
                {confirmLoading ? "Saving..." : "Confirm Won"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-xl text-xs font-semibold text-red-700 flex items-center gap-3">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-red-500 hover:text-red-800">✕</button>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {viewingNoteLead && (
        <ViewNoteModal
          lead={viewingNoteLead}
          onClose={() => setViewingNoteLead(null)}
          onSaveNote={handleSaveNote}
        />
      )}

      {reminderLead && (
        <SetReminderModal
          leadId={reminderLead.id}
          leadName={reminderLead.name}
          initialReminderAt={reminderLead.reminderAt}
          initialNote={reminderLead.notes}
          onClose={() => setReminderLead(null)}
          onSaved={(newReminderAt, note) => {
            setLeads((prev) =>
              prev.map((l) => (l.id === reminderLead.id ? { ...l, reminderAt: newReminderAt, notes: note } : l))
            );
            setReminderLead(null);
          }}
          onCleared={() => {
            setLeads((prev) =>
              prev.map((l) => (l.id === reminderLead.id ? { ...l, reminderAt: undefined } : l))
            );
            setReminderLead(null);
          }}
        />
      )}

      {editingLead && (
        <LeadDrawer
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSubmit={(data) => handleUpdateLead(editingLead.id, data)}
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

export default function AssignedLeadsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-zinc-400">Loading assigned leads...</div>}>
      <AssignedLeadsContent />
    </Suspense>
  );
}
