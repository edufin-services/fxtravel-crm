"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CHANNELS, SERVICES, STAGES, type Channel, type Stage } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import LeadDrawer, { type DrawerLead, type LeadDocument, type LeadUpdate } from "./LeadDrawer";
import SetReminderModal from "./SetReminderModal";
import ViewNoteModal, { getNoteStatus } from "./ViewNoteModal";
import { playReminderChime, sendBrowserNotification } from "@/lib/sound";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type Lead = DrawerLead & { value: number };

// ── Stage meta & labels ────────────────────────────────────────────────────────
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

// ── Travel CRM services list ──────────────────────────────────────────────────
const TRAVEL_SERVICES = [
  "Domestic Tours",
  "International Tours",
  "Flights/Hotels",
  "Others",
];

// ── Card colour styling ────────────────────────────────────────────────────────
const LEAD_COLORS = [
  { value: "",        bg: "bg-white",          border: "border-zinc-200/90",   accent: "" },
  { value: "sky",     bg: "bg-[#0284c7]",      border: "border-[#0369a1]",    accent: "" },
  { value: "emerald", bg: "bg-[#059669]",      border: "border-[#047857]",    accent: "" },
  { value: "amber",   bg: "bg-[#d97706]",      border: "border-[#b45309]",    accent: "" },
  { value: "violet",  bg: "bg-[#7c3aed]",      border: "border-[#6d28d9]",    accent: "" },
  { value: "rose",    bg: "bg-[#e11d48]",      border: "border-[#be123c]",    accent: "" },
  { value: "orange",  bg: "bg-[#ea580c]",      border: "border-[#c2410c]",    accent: "" },
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

function tableRowBg(color?: string) {
  switch (color) {
    case "sky":
      return "bg-[#0284c7] text-white hover:bg-[#0369a1]";
    case "emerald":
      return "bg-[#059669] text-white hover:bg-[#047857]";
    case "amber":
      return "bg-[#d97706] text-white hover:bg-[#b45309]";
    case "violet":
      return "bg-[#7c3aed] text-white hover:bg-[#6d28d9]";
    case "rose":
      return "bg-[#e11d48] text-white hover:bg-[#be123c]";
    case "orange":
      return "bg-[#ea580c] text-white hover:bg-[#c2410c]";
    default:
      return "bg-white hover:bg-zinc-50/90 text-zinc-900 border-l-4 border-l-transparent";
  }
}

// ── Channel Icon Component ─────────────────────────────────────────────────────
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
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    case "Email":
      return (
        <svg className={`${className} text-sky-600`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      );
    default:
      return (
        <svg className={`${className} text-amber-600`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      );
  }
}

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

export function getReminderStatus(reminderAt?: string | null): {
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

  if (diffMs <= 2 * 60 * 60 * 1000) {
    const inMinutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
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

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-zinc-200" />
        <div className="h-3 w-12 rounded bg-zinc-100" />
      </div>
      <div className="mt-3 h-3 w-24 rounded bg-zinc-100" />
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-14 rounded-lg bg-zinc-100" />
        <div className="h-5 w-20 rounded-lg bg-zinc-100" />
      </div>
      <div className="mt-4 flex items-center justify-between pt-2 border-t border-zinc-100">
        <div className="flex gap-2">
          <div className="h-7 w-7 rounded-xl bg-zinc-100" />
          <div className="h-7 w-7 rounded-xl bg-zinc-100" />
        </div>
        <div className="h-7 w-20 rounded-xl bg-zinc-200" />
      </div>
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

  // Filters State
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("All Stages");
  const [channelFilter, setChannelFilter] = useState<Channel | "All">("All");
  const [serviceFilter, setServiceFilter] = useState<string>("All Services");
  const [locationFilter, setLocationFilter] = useState<string>("All Locations");
  const [datePreset, setDatePreset] = useState<"All Time" | "Today" | "7 Days" | "30 Days" | "Custom">("All Time");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [pendingStage, setPendingStage] = useState<{ id: string; from: Stage; to: Stage } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewingNoteLead, setViewingNoteLead] = useState<Lead | null>(null);
  const [reminderLead, setReminderLead] = useState<Lead | null>(null);
  const [myId, setMyId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Ensure body scroll is unlocked
  useEffect(() => {
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");
  }, []);

  // ── Reminder notifications ──────────────────────────────────────────────────
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

  useEffect(() => {
    if (targetLeadId && leads.length > 0) {
      const matched = leads.find((l) => l.id === targetLeadId);
      if (matched) {
        setEditingLead(matched);
      }
    }
  }, [targetLeadId, leads]);

  useEffect(() => {
    function checkReminders() {
      const now = Date.now();
      let hasFiredNew = false;

      leads.forEach((lead) => {
        if (!lead.reminderAt) return;
        const fireTime = new Date(lead.reminderAt).getTime();
        if (fireTime <= now && !firedReminderIds.current.has(lead.id)) {
          firedReminderIds.current.add(lead.id);
          hasFiredNew = true;
          setReminderAlerts((prev) => [
            ...prev,
            { leadId: lead.id, leadName: lead.name, note: lead.notes ?? "", firedAt: new Date() },
          ]);

          sendBrowserNotification(`Reminder: ${lead.name}`, {
            body: lead.notes ? `${lead.notes}` : "Follow up reminder is due now.",
          });
        }
      });

      if (hasFiredNew) {
        playReminderChime();
      }
    }

    checkReminders();
    const interval = setInterval(checkReminders, 15_000);
    return () => clearInterval(interval);
  }, [leads]);

  function dismissReminder(leadId: string) {
    setReminderAlerts((prev) => prev.filter((a) => a.leadId !== leadId));
    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderAt: null }),
    }).then(() => {
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, reminderAt: undefined } : l));
    });
  }

  function snoozeReminder(leadId: string, duration: 15 | 60 | "tomorrow" = 15) {
    let target = new Date();
    if (duration === 15) {
      target = new Date(Date.now() + 15 * 60 * 1000);
    } else if (duration === 60) {
      target = new Date(Date.now() + 60 * 60 * 1000);
    } else if (duration === "tomorrow") {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    }

    const newTime = target.toISOString();
    setReminderAlerts((prev) => prev.filter((a) => a.leadId !== leadId));
    firedReminderIds.current.delete(leadId);
    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderAt: newTime }),
    }).then(() => {
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, reminderAt: newTime } : l));
    });
  }

  async function handleAddDeal(deal: {
    name: string; channel: Channel; stage: Stage; phone: string; services?: string[]; notes?: string; value?: number; city?: string; state?: string;
  }) {
    const res = await fetch("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deal),
    });
    const data = await res.json();
    if (res.ok) { setLeads((p) => [data.lead, ...p]); setModalStage(null); }
    return data;
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

  function handleStageChange(id: string, toStage: Stage) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setPendingStage({ id, from: lead.stage, to: toStage });
  }

  async function handleDirectStageChange(id: string, newStage: Stage) {
    const prevLead = leads.find((l) => l.id === id);
    if (!prevLead || prevLead.stage === newStage) return;

    if (newStage === "Confirmed") {
      handleStageChange(id, newStage);
      return;
    }

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

  async function confirmStageChange(revenue?: number) {
    if (!pendingStage) return;
    setConfirmLoading(true);
    const payload: { stage: Stage; value?: number } = { stage: pendingStage.to };
    if (pendingStage.to === "Confirmed" && typeof revenue === "number") {
      payload.value = revenue;
    }
    const res = await fetch(`/api/leads/${pendingStage.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setConfirmLoading(false);
    setPendingStage(null);
    if (res.ok) {
      setLeads((p) =>
        p.map((l) =>
          l.id === pendingStage.id
            ? { ...l, stage: pendingStage.to, ...(payload.value !== undefined ? { value: payload.value } : {}) }
            : l
        )
      );
      setEditingLead((p) =>
        p?.id === pendingStage.id
          ? { ...p, stage: pendingStage.to, ...(payload.value !== undefined ? { value: payload.value } : {}) }
          : p
      );
    } else {
      setErrorMsg(data.error ?? "Cannot move to that stage.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Move this deal to trash? You can restore it later from the Trash tab.")) return;
    setLeads((p) => p.filter((l) => l.id !== id));
    setEditingLead(null);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
  }

  async function handleUpdateDeal(id: string, data: LeadUpdate) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok) {
      if (myId && body.lead.ownerId && body.lead.ownerId !== myId) {
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

  // ── Dynamic filter options ───────────────────────────────────────────────────
  const availableServices = useMemo(() => {
    const set = new Set<string>(TRAVEL_SERVICES);
    leads.forEach((l) => {
      if (Array.isArray(l.services)) l.services.forEach((s) => s && set.add(s));
      if (l.serviceType) set.add(l.serviceType);
    });
    return Array.from(set);
  }, [leads]);

  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    leads.forEach((l) => {
      if (l.city?.trim()) locs.add(l.city.trim());
      else if (l.state?.trim()) locs.add(l.state.trim());
    });
    return Array.from(locs).sort();
  }, [leads]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (datePreset !== "All Time") count++;
    if (stageFilter !== "All Stages") count++;
    if (channelFilter !== "All") count++;
    if (serviceFilter !== "All Services") count++;
    if (locationFilter !== "All Locations") count++;
    return count;
  }, [datePreset, stageFilter, channelFilter, serviceFilter, locationFilter]);

  function handleResetFilters() {
    setDatePreset("All Time");
    setStartDate("");
    setEndDate("");
    setStageFilter("All Stages");
    setChannelFilter("All");
    setServiceFilter("All Services");
    setLocationFilter("All Locations");
  }

  // ── Filtered leads list ───────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // 1. Stage Filter
      const matchStage = stageFilter === "All Stages" || l.stage === stageFilter;

      // 2. Channel Filter
      const matchChannel = channelFilter === "All" || l.channel === channelFilter;

      // 3. Service Filter
      const activeServices = (l.services && l.services.length > 0 ? l.services : l.serviceType ? [l.serviceType] : [])
        .filter((s) => Boolean(s) && s !== "Tours & Packages");
      const matchService =
        serviceFilter === "All Services" ||
        activeServices.includes(serviceFilter) ||
        (serviceFilter === "Domestic Tours" && (l.services?.includes("Tours & Packages") || l.serviceType === "Tours & Packages"));

      // 4. Location Filter
      const matchLocation =
        locationFilter === "All Locations" ||
        l.city?.toLowerCase() === locationFilter.toLowerCase() ||
        l.state?.toLowerCase() === locationFilter.toLowerCase();

      // 5. Date Range Filter
      let matchDate = true;
      if (datePreset !== "All Time") {
        const leadTime = new Date(l.createdAt).getTime();
        const now = new Date();

        if (datePreset === "Today") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          matchDate = leadTime >= startOfToday;
        } else if (datePreset === "7 Days") {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          matchDate = leadTime >= d.getTime();
        } else if (datePreset === "30 Days") {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          matchDate = leadTime >= d.getTime();
        } else if (datePreset === "Custom") {
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

      return matchStage && matchChannel && matchService && matchLocation && matchDate;
    }).sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [leads, stageFilter, channelFilter, serviceFilter, locationFilter, datePreset, startDate, endDate, sortOrder]);

  const confirmedCount = filteredLeads.filter((l) => l.stage === "Confirmed").length;
  const total = filteredLeads.length;

  return (
    <div className="flex h-full flex-col gap-0">

      {/* ── Top Header Bar ──────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Leads &amp; Pipeline</h1>
            <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 border border-emerald-200/80">
              Active CRM
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">Manage and convert enquiry leads through your 4-stage pipeline</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle: [ || ] (Kanban) and [ = ] (List) */}
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

          {/* New Lead Button */}
          <button
            onClick={() => setModalStage(STAGES[0])}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
            New Lead
          </button>
        </div>
      </div>

      {/* ── Stats + Filters Row ──────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Stat Chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-white px-5 py-2.5 shadow-2xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider leading-none">TOTAL ENQUIRIES</p>
              <p className="text-2xl font-black text-zinc-900 leading-tight mt-0.5">{loading ? "—" : total}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-5 py-2.5 shadow-2xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider leading-none">CONFIRMED</p>
              <p className="text-2xl font-black text-emerald-700 leading-tight mt-0.5">{loading ? "—" : confirmedCount}</p>
            </div>
          </div>
        </div>

        {/* Filters Button with Dropdown Popover */}
        <div className="relative">
          <button
            onClick={() => setShowFilterPopover((p) => !p)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all shadow-2xs ${
              activeFilterCount > 0 || showFilterPopover
                ? "border-emerald-500 bg-emerald-50/60 text-emerald-800 ring-2 ring-emerald-100"
                : "border-zinc-200/90 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                {activeFilterCount}
              </span>
            )}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform duration-200 ${showFilterPopover ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Floating Filter Popover */}
          {showFilterPopover && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowFilterPopover(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-[380px] max-w-[95vw] z-40 rounded-2xl bg-white p-4 shadow-2xl border border-zinc-200/90 max-h-[calc(100vh-130px)] overflow-y-auto animate-fadeIn">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="text-xs font-black text-zinc-900">Filter Leads</h3>
                  </div>
                  <button
                    onClick={() => setShowFilterPopover(false)}
                    className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                    title="Close"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Date Range Section */}
                <div className="pt-2.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Date Range
                  </label>
                  <div className="flex items-center gap-1 p-0.5 bg-zinc-100/90 rounded-xl">
                    {(["All Time", "Today", "7 Days", "30 Days", "Custom"] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDatePreset(preset)}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all text-center ${
                          datePreset === preset
                            ? "bg-zinc-900 text-white shadow-2xs"
                            : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {datePreset === "Custom" && (
                    <div className="mt-2 flex items-center gap-1.5 p-1.5 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="flex-1">
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase">From</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full text-[11px] font-semibold bg-transparent text-zinc-800 focus:outline-none"
                        />
                      </div>
                      <span className="text-zinc-300 font-bold text-xs">→</span>
                      <div className="flex-1">
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase">To</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full text-[11px] font-semibold bg-transparent text-zinc-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2-Column Grid */}
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {/* Stage */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Stage
                    </label>
                    <div className="relative">
                      <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50/80 pl-2.5 pr-7 py-1.5 text-xs font-bold text-zinc-800 hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="All Stages">All Stages</option>
                        {STAGES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Source Channel */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Source Channel
                    </label>
                    <div className="relative">
                      <select
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value as any)}
                        className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50/80 pl-2.5 pr-7 py-1.5 text-xs font-bold text-zinc-800 hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="All">All Channels</option>
                        {CHANNELS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Service (Travel CRM) */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Service
                    </label>
                    <div className="relative">
                      <select
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50/80 pl-2.5 pr-7 py-1.5 text-xs font-bold text-zinc-800 hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="All Services">All Services</option>
                        {availableServices.map((svc) => (
                          <option key={svc} value={svc}>{svc}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Location
                    </label>
                    <div className="relative">
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50/80 pl-2.5 pr-7 py-1.5 text-xs font-bold text-zinc-800 hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="All Locations">All Locations</option>
                        {availableLocations.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    {activeFilterCount > 0 ? (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Clear filters ({activeFilterCount})
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400 font-medium">No active filters</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilterPopover(false)}
                    className="rounded-xl bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors shadow-2xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT (KANBAN OR TABLE VIEW) ───────────────────────────────── */}
      {viewMode === "kanban" ? (
        /* ── Kanban board: 4 equal columns fitting 100% within screen width without getting cut off ── */
        <div className="grid grid-cols-4 gap-2.5 w-full pb-6 min-h-[calc(100vh-210px)]">
          {STAGES.map((stage) => {
            const meta = stageMeta[stage] ?? stageMeta["Initial"];
            const stageLabel = STAGE_LABELS[stage] ?? stage.toUpperCase();
            const deals = filteredLeads
              .filter((l) => l.stage === stage)
              .sort((a, b) => {
                const timeA = new Date(a.createdAt || 0).getTime();
                const timeB = new Date(b.createdAt || 0).getTime();
                return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
              });

            return (
              <div
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverStage !== stage) setDragOverStage(stage);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverStage((p) => (p === stage ? null : p));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const id = e.dataTransfer.getData("text/plain") || draggingId;
                  if (id) handleStageChange(id, stage);
                  setDraggingId(null);
                }}
                className={`flex min-w-0 flex-col rounded-2xl bg-[#f8fafc] p-2.5 transition-all duration-200 border border-zinc-200/80 h-full ${
                  dragOverStage === stage ? "ring-2 ring-emerald-500 bg-emerald-50/40 border-emerald-300 scale-[1.01]" : ""
                }`}
              >
                {/* Column header matching Forex CRM */}
                <div className="mb-2.5 flex items-center justify-between px-1 pt-0.5 pb-2 border-b border-zinc-200/70">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`h-2.5 w-2.5 flex-none rounded-full ${meta.dot} shadow-xs`} />
                    <h2 className="truncate text-[11.5px] font-black text-zinc-900 uppercase tracking-wider">{stageLabel}</h2>
                  </div>
                  <span className={`ml-1.5 flex-none rounded-full px-2 py-0.5 text-[10.5px] font-bold min-w-[20px] text-center shadow-2xs ${
                    deals.length > 0 ? meta.badge : "bg-zinc-200 text-zinc-600"
                  }`}>
                    {loading ? "·" : deals.length}
                  </span>
                </div>

                {/* Cards list */}
                <div className="flex flex-col gap-2.5">
                  {loading ? (
                    <>
                      <SkeletonCard />
                      <SkeletonCard />
                    </>
                  ) : deals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 px-3 text-center rounded-xl border border-dashed border-zinc-200/90 bg-white/40">
                      <p className="text-[11px] text-zinc-400 font-semibold">No enquiries in {stageLabel}</p>
                    </div>
                  ) : (
                    deals.map((deal) => {
                      const isColored = isColoredCard(deal.color);
                      const noteStatus = getNoteStatus(deal.notes, deal.formNotes);
                      const remStatus = getReminderStatus(deal.reminderAt);
                      const locText = deal.city?.trim() || deal.state?.trim() || "";

                      const rawList = deal.services && deal.services.length > 0 ? deal.services : deal.serviceType ? [deal.serviceType] : [];
                      const filtered = rawList.filter((s) => Boolean(s) && s !== "Tours & Packages");
                      const displayServices = filtered.length > 0 ? filtered : rawList.includes("Tours & Packages") ? ["Domestic Tours"] : [];

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
                          className={`group relative cursor-pointer rounded-2xl border p-3 transition-all duration-150 hover:-translate-y-0.5 active:cursor-grabbing select-none shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-md ${cardBg(deal.color)} ${draggingId === deal.id ? "opacity-30 scale-95" : ""}`}
                        >
                          {/* Row 1: Lead Name + Relative Time + Delete */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-[13px] font-bold leading-snug ${isColored ? "text-white" : "text-zinc-900 group-hover:text-emerald-700 transition-colors"}`}>
                                {deal.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-[10.5px] font-medium ${isColored ? "text-white/80" : "text-zinc-400"}`}>
                                {formatRelativeTime(deal.createdAt)}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(deal.id); }}
                                className={`opacity-0 group-hover:opacity-100 rounded p-0.5 transition-all shrink-0 ${isColored ? "text-white/60 hover:text-white hover:bg-white/20" : "text-zinc-400 hover:text-red-500 hover:bg-red-50"}`}
                                title="Delete Lead"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Phone */}
                          {deal.phone && (
                            <div className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${isColored ? "text-white/90" : "text-zinc-600"}`}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isColored ? "text-white/80" : "text-zinc-400 shrink-0"}>
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.9.36 1.84.58 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round"/>
                              </svg>
                              <span className="truncate">{deal.phone}</span>
                            </div>
                          )}

                          {/* Row 3: Badges (Location, Channel, Service, Revenue) */}
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            {locText && (
                              <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                                isColored
                                  ? "bg-white text-zinc-900 border-white/60 shadow-2xs"
                                  : "bg-[#fef3c7] text-[#b45309] border-[#fde68a]"
                              }`}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isColored ? "text-zinc-700" : "text-amber-600"}>
                                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/>
                                </svg>
                                {locText}
                              </span>
                            )}

                            <span className={`inline-flex items-center justify-center rounded-md p-1 border ${
                              isColored ? "bg-white border-white/60 shadow-2xs text-zinc-800" : "bg-white border-zinc-200/90 shadow-2xs"
                            }`} title={deal.channel}>
                              <ChannelIcon channel={deal.channel} className="h-2.5 w-2.5" />
                            </span>

                            {displayServices.map((svc) => (
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
                              <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                                isColored
                                  ? "bg-white text-emerald-900 border-white/60 shadow-2xs"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}>
                                <span>₹</span>{deal.value.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>

                          {/* Row 4: Action Footer (Bell, Note, Move next / Won) */}
                          <div className={`mt-2.5 flex items-center justify-between gap-1 pt-2 border-t ${
                            isColored ? "border-white/20" : "border-zinc-100"
                          }`}>
                            {/* Left: Reminder & Note buttons */}
                            <div className="flex items-center gap-1">
                              {/* Reminder Bell button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setReminderLead(deal); }}
                                className={`relative flex h-6.5 w-6.5 items-center justify-center rounded-lg border transition-all ${
                                  isColored
                                    ? "bg-white/20 text-white border-white/30 hover:bg-white/30"
                                    : remStatus.state === "overdue"
                                    ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                    : remStatus.state === "duesoon" || remStatus.state === "today"
                                    ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                                    : remStatus.state === "future"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                    : "bg-white text-zinc-400 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-600"
                                }`}
                                title={deal.reminderAt ? `Reminder: ${remStatus.label}` : "Set reminder"}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                </svg>
                                {remStatus.state !== "none" && (
                                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 rounded-full bg-red-500 ring-1.5 ring-white" />
                                )}
                              </button>

                              {/* Note Pencil button matching Forex CRM */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setViewingNoteLead(deal); }}
                                className={`relative flex h-6.5 w-6.5 items-center justify-center rounded-lg border transition-all ${
                                  noteStatus.hasAnyNote
                                    ? "bg-[#fbbf24] text-zinc-900 border-[#f59e0b] shadow-2xs font-bold"
                                    : isColored
                                    ? "bg-white/20 text-white border-white/30 hover:bg-white/30"
                                    : "bg-white text-zinc-400 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-600"
                                }`}
                                title={noteStatus.hasAnyNote ? "View Note" : "Add note"}
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/>
                                </svg>
                                {noteStatus.hasAnyNote && (
                                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 rounded-full bg-[#ea580c] ring-1.5 ring-white" />
                                )}
                              </button>
                            </div>

                            {/* Right: Move next button / Status matching Forex CRM */}
                            {stage === "Initial" ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDirectStageChange(deal.id, "Connected"); }}
                                className="flex items-center gap-1 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition-all active:scale-95 whitespace-nowrap"
                              >
                                <span>Move next</span>
                                <span className="font-bold">➔</span>
                              </button>
                            ) : stage === "Connected" ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, "Confirmed"); }}
                                className="flex items-center gap-1 rounded-lg bg-[#059669] hover:bg-[#047857] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition-all active:scale-95 whitespace-nowrap"
                              >
                                <span>Move next</span>
                                <span className="font-bold">➔</span>
                              </button>
                            ) : stage === "Confirmed" ? (
                              <span className="flex items-center gap-1 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-0.5 text-[11px] font-bold text-[#059669] whitespace-nowrap">
                                <span>✓</span>
                                <span>Won</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-0.5 text-[11px] font-bold text-red-600 whitespace-nowrap">
                                Closed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Lead button matching Forex CRM */}
                {!loading && (
                  <button
                    onClick={() => setModalStage(stage)}
                    className="mt-2.5 flex-none flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white/70 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-white hover:border-zinc-400 shadow-2xs transition-all"
                  >
                    <span className="text-sm font-bold leading-none">+</span>
                    <span>Add Lead</span>
                  </button>
                )}

                {/* Stretched drop target area: fills remaining height to bottom of column */}
                <div className="flex-1 min-h-[60px]" />
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
                  <th className="px-5 py-3.5 text-center">Channel</th>
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
                    const isColored = isColoredCard(deal.color);
                    const noteStatus = getNoteStatus(deal.notes, deal.formNotes);
                    const remStatus = getReminderStatus(deal.reminderAt);
                    const locText = deal.city?.trim() || deal.state?.trim() || "";

                    const rawList = deal.services && deal.services.length > 0 ? deal.services : deal.serviceType ? [deal.serviceType] : [];
                    const filtered = rawList.filter((s) => Boolean(s) && s !== "Tours & Packages");
                    const displayServices = filtered.length > 0 ? filtered : rawList.includes("Tours & Packages") ? ["Domestic Tours"] : [];

                    return (
                      <tr
                        key={deal.id}
                        onClick={() => setEditingLead(deal)}
                        className={`transition-colors cursor-pointer group ${tableRowBg(deal.color)}`}
                      >
                        {/* Lead Name with avatar and contact number right below name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-2xs ${
                              isColored
                                ? "bg-white text-zinc-900"
                                : `bg-gradient-to-br ${grad(deal.name)} text-white`
                            }`}>
                              {initials(deal.name)}
                            </div>
                            <div className="min-w-0">
                              <p className={`font-extrabold leading-tight text-sm ${isColored ? "text-white" : "text-zinc-900 group-hover:text-emerald-700 transition-colors"}`}>
                                {deal.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {deal.phone && (
                                  <span className={`text-xs font-medium tracking-tight ${isColored ? "text-white/80" : "text-zinc-500"}`}>
                                    {deal.phone}
                                  </span>
                                )}
                                {locText && (
                                  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[10px] font-bold border ${
                                    isColored
                                      ? "bg-white text-zinc-900 border-white/60"
                                      : "bg-amber-50 text-amber-800 border-amber-200/80"
                                  }`}>
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                                    {locText}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Services */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {displayServices.length === 0 ? (
                              <span className={isColored ? "text-white/40 text-xs" : "text-zinc-300 text-xs"}>—</span>
                            ) : (
                              displayServices.map((svc) => (
                                <span
                                  key={svc}
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold border shadow-2xs ${
                                    isColored
                                      ? "bg-white text-emerald-900 border-white/60"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                                  }`}
                                >
                                  {svc}
                                </span>
                              ))
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
                                isColored
                                  ? "bg-white/20 text-white border-white/40"
                                  : deal.stage === "Initial"
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
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center">
                            <span
                              className={`inline-flex items-center justify-center rounded-lg p-1.5 border shadow-2xs ${
                                isColored ? "bg-white border-white/60" : "bg-zinc-50 border-zinc-200"
                              }`}
                              title={deal.channel}
                            >
                              <ChannelIcon channel={deal.channel} className="h-4 w-4" />
                            </span>
                          </div>
                        </td>

                        {/* Notes & Reminder indicators */}
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingNoteLead(deal)}
                              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all border shadow-2xs ${
                                noteStatus.hasAnyNote
                                  ? "bg-[#fef9c3] text-[#78350f] border-[#fde047] hover:bg-[#fef08a]"
                                  : isColored
                                  ? "bg-white/20 text-white border-white/30 hover:bg-white/30"
                                  : "bg-white text-zinc-500 border-zinc-200/90 hover:bg-zinc-50 hover:text-zinc-700"
                              }`}
                              title={noteStatus.hasAnyNote ? "View Note" : "Add note"}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/></svg>
                              <span>Note</span>
                            </button>

                            <button
                              onClick={() => setReminderLead(deal)}
                              className={`relative flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                                isColored
                                  ? "bg-white/20 text-white border-white/30"
                                  : remStatus.state === "overdue"
                                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 shadow-2xs"
                                  : remStatus.state === "duesoon"
                                  ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 shadow-2xs"
                                  : remStatus.state === "today"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                  : remStatus.state === "future"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                                  : "bg-zinc-50 text-zinc-400 border-zinc-200/60 hover:text-zinc-700 hover:bg-zinc-100"
                              }`}
                              title={deal.reminderAt ? `Reminder: ${remStatus.label}` : "Set reminder"}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                              </svg>
                              {remStatus.state !== "none" && (
                                <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className={`px-5 py-3.5 text-xs whitespace-nowrap ${isColored ? "text-white/80" : "text-zinc-400"}`}>
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
              <div className="mt-3 flex items-center justify-between gap-1.5 flex-wrap pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-zinc-400">Snooze:</span>
                  <button
                    onClick={() => snoozeReminder(alert.leadId, 15)}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                    title="Snooze for 15 minutes"
                  >
                    15m
                  </button>
                  <button
                    onClick={() => snoozeReminder(alert.leadId, 60)}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                    title="Snooze for 1 hour"
                  >
                    1h
                  </button>
                  <button
                    onClick={() => snoozeReminder(alert.leadId, "tomorrow")}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                    title="Snooze until tomorrow 9:00 AM"
                  >
                    Tomorrow
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      dismissReminder(alert.leadId);
                      const lead = leads.find((l) => l.id === alert.leadId);
                      if (lead) setEditingLead(lead);
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-colors"
                  >
                    Open Lead
                  </button>
                </div>
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
          initialReminderAt={reminderLead.reminderAt}
          initialNote={reminderLead.notes}
          onClose={() => setReminderLead(null)}
          onSaved={(reminderAt, note) => {
            setLeads((prev) => prev.map((l) => (l.id === reminderLead.id ? { ...l, notes: note, reminderAt } : l)));
            firedReminderIds.current.delete(reminderLead.id);
          }}
          onCleared={() => {
            setLeads((prev) => prev.map((l) => (l.id === reminderLead.id ? { ...l, reminderAt: undefined } : l)));
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
          initialValue={leads.find((l) => l.id === pendingStage.id)?.value}
          loading={confirmLoading}
          onConfirm={(revenue) => confirmStageChange(revenue)}
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
function ConfirmStageModal({
  leadName, from, to, initialValue = 0, loading, onConfirm, onCancel,
}: {
  leadName: string; from: Stage; to: Stage; initialValue?: number; loading: boolean;
  onConfirm: (revenue?: number) => void; onCancel: () => void;
}) {
  useBodyScrollLock();
  const [revenue, setRevenue] = useState<number | "">(initialValue > 0 ? initialValue : "");
  const isConfirmed = to === "Confirmed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overscroll-contain"
      onClick={onCancel}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
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
            {isConfirmed ? "Deal Confirmed!" : "Move to next stage?"}
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
                <span className="font-semibold text-emerald-600">{to}</span>.
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
              isConfirmed ? "bg-emerald-600 hover:bg-emerald-700" : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {loading ? "Moving…" : isConfirmed ? "Confirm Deal" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Deal Modal ─────────────────────────────────────────────────────────────
function AddDealModal({
  stage, onClose, onSubmit,
}: {
  stage: Stage; onClose: () => void;
  onSubmit: (deal: {
    name: string; channel: Channel; stage: Stage; phone: string; services?: string[]; notes?: string; value?: number; city?: string; state?: string;
  }) => Promise<{ error?: string }>;
}) {
  useBodyScrollLock();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel>(CHANNELS[0]);
  const [phone, setPhone] = useState("");
  const [stageVal, setStageVal] = useState<Stage>(stage);
  const [value, setValue] = useState<number | "">("");
  const [selectedServices, setSelectedServices] = useState<string[]>(["Domestic Tours"]);
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
      value: typeof value === "number" && value >= 0 ? value : 0,
    });
    setLoading(false);
    if (result.error) setError(result.error);
  }

  const inputCls = "mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80 flex flex-col overflow-hidden animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-zinc-900">New lead</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Add a lead to your pipeline</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/></svg>
          </button>
        </div>

        {error && <div className="mx-6 mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700 shrink-0">{error}</div>}

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 flex-1">
          {/* Row 1: Name & Phone Number side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">FULL NAME *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">PHONE NUMBER *</label>
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
          </div>

          {/* Services Selection (Pill Checkboxes with Checkmark) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">SERVICES (SELECT ALL THAT APPLY)</label>
            <div className="flex flex-wrap gap-2">
              {["Domestic Tours", "International Tours", "Flights/Hotels", "Others"].map((svc) => {
                const isSelected = selectedServices.includes(svc);
                return (
                  <label
                    key={svc}
                    className={`flex items-center gap-2 cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-emerald-50/70 border-emerald-500 text-emerald-800 shadow-2xs"
                        : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleService(svc)}
                      className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 cursor-pointer accent-blue-600"
                    />
                    <span>{svc}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">CHANNEL</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className={inputCls}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">STAGE</label>
              <select value={stageVal} onChange={(e) => setStageVal(e.target.value as Stage)} className={inputCls}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {stageVal === "Confirmed" && (
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                DEAL REVENUE (₹)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-zinc-400 select-none">₹</span>
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 50000"
                  className={`${inputCls} pl-6 font-bold text-zinc-900`}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">NOTES</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." className={`${inputCls} resize-none`} />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 shrink-0">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors shadow-2xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white transition-colors shadow-sm shadow-emerald-600/20 active:scale-[0.98]">
              {loading ? "Adding…" : "Add lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
