"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CHANNELS, SERVICES, STAGES, type Channel, type Stage } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import { SearchIcon } from "@/app/dashboard/icons";
import LeadDrawer, { type DrawerLead } from "@/app/dashboard/leads/LeadDrawer";
import SetReminderModal from "@/app/dashboard/leads/SetReminderModal";
import ViewNoteModal, { getNoteStatus } from "@/app/dashboard/leads/ViewNoteModal";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type Lead = DrawerLead & {
  value: number;
  ownerId: string;
  assignedBranchName?: string;
  assignedBranchId?: string;
  formNotes?: string;
};
type Agent = { id: string; name: string; email: string; company: string };

const STAGE_COLORS: Record<string, string> = {
  Initial: "bg-blue-50 text-blue-700",
  Connected: "bg-amber-50 text-amber-700",
  Confirmed: "bg-emerald-50 text-emerald-700",
  Closed: "bg-red-50 text-red-700",
};

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
  "Air Tickets",
  "Visa Assistance",
  "Hotels",
  "Travel Insurance",
  "Others",
];

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
  S:"from-emerald-400 to-emerald-600",T:"from-teal-400 to-teal-600",U:"from-cyan-400 to-cyan-600",
  V:"from-violet-400 to-violet-600",W:"from-pink-400 to-pink-600",X:"from-indigo-400 to-indigo-600",
  Y:"from-amber-400 to-amber-600",Z:"from-red-400 to-red-600",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function grad(name: string) {
  const k = (name[0] ?? "A").toUpperCase();
  return GRADIENTS[k] ?? "from-zinc-400 to-zinc-600";
}

const COLOR_AVATAR_GRADIENTS: Record<string, string> = {
  sky: "from-sky-400 to-sky-600",
  emerald: "from-emerald-400 to-emerald-600",
  amber: "from-amber-400 to-amber-600",
  violet: "from-violet-400 to-violet-600",
  rose: "from-rose-400 to-rose-600",
  orange: "from-orange-400 to-orange-600",
};

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
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

export default function AdminLeadsClient({
  initialLeads,
  agents,
  branchLocations = [],
}: {
  initialLeads: Lead[];
  agents: Agent[];
  branchLocations?: string[];
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_leads_view_mode");
      if (saved === "kanban" || saved === "table") {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  function handleSetViewMode(mode: "kanban" | "table") {
    setViewMode(mode);
    try {
      localStorage.setItem("admin_leads_view_mode", mode);
    } catch {}
  }

  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [reminderLead, setReminderLead] = useState<Lead | null>(null);
  const [viewingNoteLead, setViewingNoteLead] = useState<Lead | null>(null);

  const searchParams = useSearchParams();
  const initialLocation = searchParams?.get("location") || "All Locations";

  const [userFilter, setUserFilter] = useState<string>("All Users");
  const [stageFilter, setStageFilter] = useState<string>("All Stages");
  const [channelFilter, setChannelFilter] = useState<Channel | "All">("All");
  const [serviceFilter, setServiceFilter] = useState<string>("All Services");
  const [locationFilter, setLocationFilter] = useState<string>(initialLocation);
  const [datePreset, setDatePreset] = useState<string>("All Dates");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  const agentMap = useMemo(() => {
    const map: Record<string, string> = {};
    agents.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [agents]);

  const availableServices = useMemo(() => {
    const set = new Set<string>(TRAVEL_SERVICES);
    leads.forEach((l) => {
      if (Array.isArray(l.services)) l.services.forEach((s) => s && set.add(s));
      if (l.serviceType) set.add(l.serviceType);
    });
    return Array.from(set);
  }, [leads]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (datePreset !== "All Dates") count++;
    if (userFilter !== "All Users") count++;
    if (stageFilter !== "All Stages") count++;
    if (channelFilter !== "All") count++;
    if (serviceFilter !== "All Services") count++;
    if (locationFilter !== "All Locations") count++;
    return count;
  }, [datePreset, userFilter, stageFilter, channelFilter, serviceFilter, locationFilter]);

  function handleResetFilters() {
    setDatePreset("All Dates");
    setStartDate("");
    setEndDate("");
    setUserFilter("All Users");
    setStageFilter("All Stages");
    setChannelFilter("All");
    setServiceFilter("All Services");
    setLocationFilter("All Locations");
    setQuery("");
  }

  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    branchLocations.forEach((loc) => {
      if (loc && loc.trim()) locSet.add(loc.trim());
    });
    leads.forEach((l) => {
      if (l.city && l.city.trim()) {
        locSet.add(l.city.trim());
      }
    });
    return Array.from(locSet).sort((a, b) => a.localeCompare(b));
  }, [branchLocations, leads]);

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {
      unspecified: 0,
    };
    leads.forEach((l) => {
      const c = l.city?.trim();
      if (!c && !l.assignedBranchName) {
        counts.unspecified = (counts.unspecified || 0) + 1;
      } else if (c) {
        counts[c] = (counts[c] || 0) + 1;
      }
    });
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter((l) => {
        // Query search
        if (q) {
          const matchQuery =
            l.name.toLowerCase().includes(q) ||
            (l.phone ?? "").includes(q) ||
            (l.email ?? "").toLowerCase().includes(q) ||
            l.stage.toLowerCase().includes(q) ||
            (agentMap[l.ownerId] ?? "").toLowerCase().includes(q) ||
            (l.city ?? "").toLowerCase().includes(q) ||
            (l.assignedBranchName ?? "").toLowerCase().includes(q);
          if (!matchQuery) return false;
        }

        // User / Agent Filter
        if (userFilter !== "All Users" && l.ownerId !== userFilter) {
          return false;
        }

        // Stage Filter
        if (stageFilter !== "All Stages" && l.stage !== stageFilter) {
          return false;
        }

        // Location Filter
        if (locationFilter !== "All Locations") {
          if (locationFilter === "Unspecified / No Location") {
            if (l.city?.trim() || l.assignedBranchName?.trim()) return false;
          } else {
            const locLow = locationFilter.toLowerCase();
            const cityMatch = (l.city ?? "").trim().toLowerCase() === locLow;
            const branchMatch = (l.assignedBranchName ?? "").toLowerCase().includes(locLow);
            if (!cityMatch && !branchMatch) return false;
          }
        }

        // Channel Filter
        if (channelFilter !== "All" && l.channel !== channelFilter) {
          return false;
        }

        // Service Filter
        if (serviceFilter !== "All Services") {
          const activeServices = (l.services && l.services.length > 0 ? l.services : l.serviceType ? [l.serviceType] : [])
            .filter((s) => Boolean(s) && s !== "Tours & Packages");
          const matchService =
            activeServices.includes(serviceFilter) ||
            (serviceFilter === "Domestic Tours" && (l.services?.includes("Tours & Packages") || l.serviceType === "Tours & Packages"));
          if (!matchService) return false;
        }

        // Date Filter
        if (datePreset !== "All Dates") {
          const leadTime = new Date(l.createdAt).getTime();
          const now = new Date();

          if (datePreset === "Today") {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            if (leadTime < startOfToday) return false;
          } else if (datePreset === "Last 7 Days") {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            if (leadTime < d.getTime()) return false;
          } else if (datePreset === "Last 30 Days") {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            if (leadTime < d.getTime()) return false;
          } else if (datePreset === "Custom Range") {
            if (startDate) {
              const start = new Date(startDate).getTime();
              if (leadTime < start) return false;
            }
            if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              if (leadTime > end.getTime()) return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [
    leads,
    query,
    agentMap,
    userFilter,
    stageFilter,
    locationFilter,
    channelFilter,
    serviceFilter,
    datePreset,
    startDate,
    endDate,
    sortOrder,
  ]);

  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0);
  const filteredTotalValue = filteredLeads.reduce((s, l) => s + (l.value ?? 0), 0);
  const confirmedCount = leads.filter((l) => l.stage === "Confirmed").length;
  const isFiltered =
    Boolean(query.trim()) ||
    userFilter !== "All Users" ||
    stageFilter !== "All Stages" ||
    channelFilter !== "All" ||
    serviceFilter !== "All Services" ||
    locationFilter !== "All Locations" ||
    datePreset !== "All Dates";

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
    <div className="space-y-4 w-full">
      {/* Header matching Image 1 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">All Leads</h1>
          <p className="mt-0.5 text-xs text-zinc-500 font-medium">
            {isFiltered ? `${filteredLeads.length} of ${leads.length} leads` : `${leads.length} leads`}
            {locationFilter !== "All Locations" ? ` · ${locationFilter}` : " across all branches"} &middot; Pipeline: {fmt(isFiltered ? filteredTotalValue : totalValue)}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Add New Lead Button matching Image 1 */}
          <button
            onClick={() => setEditingLead(null)}
            className="flex items-center gap-1.5 rounded-xl bg-[#059669] hover:bg-[#047857] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95"
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span>Add New Lead</span>
          </button>

          {/* View mode toggle: [ || ] (Kanban) and [ = ] (List) */}
          <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-100 p-0.5 shadow-2xs">
            <button
              onClick={() => handleSetViewMode("kanban")}
              className={`flex items-center justify-center rounded-lg p-1.5 transition-all ${
                viewMode === "kanban" ? "bg-white text-zinc-900 shadow-xs ring-1 ring-black/5" : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="Kanban View"
              aria-label="Kanban View"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
            </button>
            <button
              onClick={() => handleSetViewMode("table")}
              className={`flex items-center justify-center rounded-lg p-1.5 transition-all ${
                viewMode === "table" ? "bg-white text-zinc-900 shadow-xs ring-1 ring-black/5" : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="List View"
              aria-label="List View"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Search + Filters Row matching Image 1 ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-zinc-400 shadow-2xs w-72 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search leads by name, phone, etc..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-semibold text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-zinc-400 hover:text-zinc-600 transition-colors" title="Clear search">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Filters Button with Dropdown Popover */}
        <div className="relative">
          <button
            onClick={() => setShowFilterPopover((p) => !p)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-2xs ${
              activeFilterCount > 0 || showFilterPopover
                ? "border-emerald-500 bg-emerald-50/60 text-emerald-800 ring-2 ring-emerald-100"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-black text-white">
                {activeFilterCount}
              </span>
            )}
            <svg
              width="11"
              height="11"
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
                    {(["All Time", "Today", "7 Days", "30 Days", "Custom"] as const).map((preset) => {
                      const isActive =
                        (preset === "All Time" && (datePreset === "All Time" || datePreset === "All Dates")) ||
                        (preset === "Today" && datePreset === "Today") ||
                        (preset === "7 Days" && (datePreset === "7 Days" || datePreset === "Last 7 Days")) ||
                        (preset === "30 Days" && (datePreset === "30 Days" || datePreset === "Last 30 Days")) ||
                        (preset === "Custom" && (datePreset === "Custom" || datePreset === "Custom Range"));

                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            if (preset === "All Time") setDatePreset("All Dates");
                            else if (preset === "7 Days") setDatePreset("Last 7 Days");
                            else if (preset === "30 Days") setDatePreset("Last 30 Days");
                            else if (preset === "Custom") setDatePreset("Custom Range");
                            else setDatePreset(preset);
                          }}
                          className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all text-center ${
                            isActive
                              ? "bg-zinc-900 text-white shadow-2xs"
                              : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>

                  {(datePreset === "Custom" || datePreset === "Custom Range") && (
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

                {/* Filter Grid */}
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

                  {/* Travel Service */}
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
                        {availableLocations.map((loc) => {
                          const count = locationCounts[loc] || 0;
                          return (
                            <option key={loc} value={loc}>
                              {loc} {count > 0 ? `(${count})` : ""}
                            </option>
                          );
                        })}
                        {locationCounts.unspecified > 0 && (
                          <option value="Unspecified / No Location">
                            Unspecified ({locationCounts.unspecified})
                          </option>
                        )}
                      </select>
                      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Agent / User (Admin-only) */}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Assigned Agent
                    </label>
                    <div className="relative">
                      <select
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50/80 pl-2.5 pr-7 py-1.5 text-xs font-bold text-zinc-800 hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="All Users">All Users &amp; Agents</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Popover Footer */}
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

      {/* ── KANBAN VIEW: 4 equal columns fitting 100% within screen width without getting cut off ── */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-4 gap-2.5 w-full pb-6 min-h-[calc(100vh-210px)]">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === stage);
            const meta = stageMeta[stage] ?? stageMeta.Initial;
            const stageLabel = STAGE_LABELS[stage] ?? stage.toUpperCase();
            const isDragTarget = dragOverStage === stage;

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
                    setDragOverStage(null);
                  }
                }}
                onDrop={() => handleDrop(stage)}
                className={`flex min-w-0 flex-col rounded-2xl bg-[#f8fafc] p-2.5 transition-all duration-200 border border-zinc-200/80 h-full ${
                  isDragTarget ? "bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-200 scale-[1.01]" : ""
                }`}
              >
                {/* Column header matching Forex CRM */}
                <div className="mb-2.5 flex items-center justify-between px-1 pt-0.5 pb-2 border-b border-zinc-200/70">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`h-2.5 w-2.5 flex-none rounded-full ${meta.dot} shadow-xs`} />
                    <h2 className="truncate text-[11.5px] font-black text-zinc-900 uppercase tracking-wider">{stageLabel}</h2>
                  </div>
                  <span className={`ml-1.5 flex-none rounded-full px-2 py-0.5 text-[10.5px] font-bold min-w-[20px] text-center shadow-2xs ${
                    stageLeads.length > 0 ? meta.badge : "bg-zinc-200 text-zinc-600"
                  }`}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards stack */}
                <div className="flex flex-col gap-2.5">
                  {stageLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 px-3 text-center rounded-xl border border-dashed border-zinc-200/90 bg-white/40">
                      <p className="text-[11px] text-zinc-400 font-semibold">No enquiries in {stageLabel}</p>
                    </div>
                  ) : (
                    stageLeads.map((deal) => {
                      const nextStage = STAGES[STAGES.indexOf(stage) + 1] as Stage | undefined;
                      const nextMeta = nextStage ? stageMeta[nextStage] : undefined;
                      const assignedName = agentMap[deal.ownerId] ?? deal.assignAgent ?? "Unassigned";
                      const isColored = isColoredCard(deal.color);
                      const noteStatus = getNoteStatus(deal.notes, deal.formNotes);
                      const locText = deal.city?.trim() || deal.assignedBranchName?.trim() || "";

                      const rawList = deal.services && deal.services.length > 0 ? deal.services : deal.serviceType ? [deal.serviceType] : [];
                      const filtered = rawList.filter((s) => Boolean(s) && s !== "Tours & Packages");
                      const displayServices = filtered.length > 0 ? filtered : rawList.includes("Tours & Packages") ? ["Domestic Tours"] : [];

                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={() => setDraggingId(deal.id)}
                          onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                          onClick={() => setEditingLead(deal)}
                          className={`group relative cursor-pointer rounded-2xl border p-3 transition-all duration-150 hover:-translate-y-0.5 active:cursor-grabbing select-none shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-md ${cardBg(deal.color)} ${
                            draggingId === deal.id ? "opacity-30 scale-95" : ""
                          }`}
                        >
                          {/* Row 1: Name + Relative time + Delete */}
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
                                onClick={(e) => { e.stopPropagation(); deleteLead(deal.id); }}
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

                          {/* Row 3: Badges (Agent, Location, Channel) */}
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                              isColored
                                ? "bg-white/20 text-white border-white/30"
                                : "bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]"
                            }`}>
                              {assignedName}
                            </span>

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
                          </div>

                          {/* Row 4: Service Pill & Deal Value */}
                          <div className="mt-1 flex flex-wrap items-center gap-1">
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

                          {/* Row 5: Action Footer (Reminder, Note, Move next) */}
                          <div className={`mt-2.5 flex items-center justify-between gap-1 pt-2 border-t ${
                            isColored ? "border-white/20" : "border-zinc-100"
                          }`}>
                            <div className="flex items-center gap-1">
                              {/* Reminder Button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setReminderLead(deal); }}
                                className={`relative flex h-6.5 w-6.5 items-center justify-center rounded-lg border transition-all ${
                                  isColored
                                    ? "bg-white/20 text-white border-white/30 hover:bg-white/30"
                                    : deal.reminderAt
                                    ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                                    : "bg-white text-zinc-400 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-600"
                                }`}
                                title={deal.reminderAt ? "Reminder active" : "Set Reminder"}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                </svg>
                                {deal.reminderAt && (
                                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1.5 ring-white" />
                                )}
                              </button>

                              {/* Note Button: amber with notification dot matching Forex CRM */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setViewingNoteLead(deal); }}
                                className={`relative flex h-6.5 w-6.5 items-center justify-center rounded-lg border transition-all ${
                                  noteStatus.hasAnyNote
                                    ? "bg-[#fbbf24] text-zinc-900 border-[#f59e0b] shadow-2xs font-bold"
                                    : isColored
                                    ? "bg-white/20 text-white border-white/30 hover:bg-white/30"
                                    : "bg-white text-zinc-400 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-600"
                                }`}
                                title={noteStatus.hasAnyNote ? "View note" : "Add note"}
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/>
                                </svg>
                                {noteStatus.hasAnyNote && (
                                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 rounded-full bg-[#ea580c] ring-1.5 ring-white" />
                                )}
                              </button>
                            </div>

                            {/* Stage progression action button matching Forex CRM */}
                            {nextStage ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); triggerStageChange(deal.id, nextStage); }}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition-all active:scale-95 whitespace-nowrap ${
                                  stage === "Initial"
                                    ? "bg-[#ea580c] hover:bg-[#c2410c]"
                                    : stage === "Connected"
                                    ? "bg-[#059669] hover:bg-[#047857]"
                                    : nextMeta ? `${nextMeta.badge} hover:opacity-95` : "bg-zinc-900"
                                }`}
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
                <button
                  onClick={() => setEditingLead(null)}
                  className="mt-2.5 flex-none flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white/70 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-white hover:border-zinc-400 shadow-2xs transition-all"
                >
                  <span className="text-sm font-bold leading-none">+</span>
                  <span>Add Lead</span>
                </button>

                {/* Stretched drop target area: fills remaining height to bottom of column */}
                <div className="flex-1 min-h-[60px]" />
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE / LIST VIEW ───────────────────────────────────────────────── */
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
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded bg-zinc-100 text-[10px] font-semibold text-zinc-600 px-1.5 py-0.5">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                {agentMap[deal.ownerId] ?? deal.assignAgent ?? "Unassigned"}
                              </span>
                              {(deal.city || deal.assignedBranchName) && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200/70 text-[10px] font-bold text-amber-800 px-1.5 py-0.5">
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  {deal.city || deal.assignedBranchName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Services */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {(() => {
                            const rawList = deal.services && deal.services.length > 0 ? deal.services : deal.serviceType ? [deal.serviceType] : [];
                            const filtered = rawList.filter((s) => Boolean(s) && s !== "Tours & Packages");
                            const displayList = filtered.length > 0 ? filtered : rawList.includes("Tours & Packages") ? ["Domestic Tours"] : [];
                            if (displayList.length === 0) {
                              return <span className="text-zinc-300 text-xs">—</span>;
                            }
                            return displayList.map((svc) => (
                              <span key={svc} className="rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800 shadow-2xs">
                                {svc}
                              </span>
                            ));
                          })()}
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
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center">
                          <span
                            className="inline-flex items-center justify-center rounded-lg p-1.5 border shadow-2xs bg-zinc-50 border-zinc-200 text-zinc-700"
                            title={deal.channel}
                          >
                            <ChannelIcon channel={deal.channel} className="h-4 w-4" />
                          </span>
                        </div>
                      </td>

                      {/* Notes & Reminder indicators */}
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const noteStatus = getNoteStatus(deal.notes, deal.formNotes);
                            return (
                              <button
                                onClick={() => setViewingNoteLead(deal)}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all border shadow-2xs ${
                                  noteStatus.hasAnyNote
                                    ? "bg-[#fef9c3] text-[#78350f] border-[#fde047] hover:bg-[#fef08a]"
                                    : "bg-white text-zinc-500 border-zinc-200/90 hover:bg-zinc-50 hover:text-zinc-700"
                                }`}
                                title={noteStatus.hasAnyNote ? "View Note" : "Add note"}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/></svg>
                                <span>Note</span>
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

      {/* ── View Note Modal ─────────────────────────────────────────────────── */}
      {viewingNoteLead && (
        <ViewNoteModal
          lead={viewingNoteLead}
          onClose={() => setViewingNoteLead(null)}
          onSaveNote={handleSaveNote}
        />
      )}

      {/* ── Reminder Modal ──────────────────────────────────────────────────── */}
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
