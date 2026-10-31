"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CLIENT_VISIT_STAGES, type ClientVisitStage } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";

export interface ClientVisitLead {
  id: string;
  name: string;
  companyName?: string;
  designation?: string;
  phone?: string;
  email?: string;
  yearlyVolume?: number;
  rateOfferedCN?: number;
  rateOfferedCard?: number;
  rateOfferedTTDD?: number;
  nextFollowUp?: string;
  feedback?: string;
  clientVisitStatus?: string;
  ownerId?: string;
  ownerName?: string;
  assignAgent?: string;
  assignedBranchId?: string;
  assignedBranchName?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface UserOption {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

export interface BranchOption {
  id: string;
  name: string;
  city?: string;
}

interface Props {
  initialVisits: ClientVisitLead[];
  users: UserOption[];
  branches: BranchOption[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; dot: string; border: string; bg: string }
> = {
  Live: {
    label: "Live / In Touch",
    badge: "bg-blue-50 text-blue-700 border-blue-200/80",
    dot: "bg-blue-500",
    border: "border-t-blue-500",
    bg: "bg-blue-50/30",
  },
  "Disc in progress": {
    label: "Discussion in Progress",
    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-500",
    border: "border-t-amber-500",
    bg: "bg-amber-50/30",
  },
  Converted: {
    label: "Converted",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dot: "bg-emerald-500",
    border: "border-t-emerald-500",
    bg: "bg-emerald-50/30",
  },
  "Not interested": {
    label: "Not Interested",
    badge: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-500",
    border: "border-t-rose-500",
    bg: "bg-rose-50/30",
  },
};

function formatINR(val?: number): string {
  if (!val || val === 0) return "₹0";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)} K`;
  return `₹${val.toLocaleString("en-IN")}`;
}

export default function AdminClientVisitsClient({ initialVisits, users, branches }: Props) {
  const [visits, setVisits] = useState<ClientVisitLead[]>(initialVisits);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [branchFilter, setBranchFilter] = useState<string>("All");
  const [agentFilter, setAgentFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ClientVisitLead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Form states for Add/Edit
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formDesignation, setFormDesignation] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formYearlyVolume, setFormYearlyVolume] = useState<number | "">("");
  const [formRateCN, setFormRateCN] = useState<number | "">("");
  const [formRateCard, setFormRateCard] = useState<number | "">("");
  const [formRateTTDD, setFormRateTTDD] = useState<number | "">("");
  const [formNextFollowUp, setFormNextFollowUp] = useState("");
  const [formStatus, setFormStatus] = useState<string>("Live");
  const [formAgentId, setFormAgentId] = useState<string>("");
  const [formBranchId, setFormBranchId] = useState<string>("");
  const [formFeedback, setFormFeedback] = useState("");

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = v.name?.toLowerCase().includes(q);
        const matchCompany = v.companyName?.toLowerCase().includes(q);
        const matchPhone = v.phone?.includes(q);
        const matchEmail = v.email?.toLowerCase().includes(q);
        const matchDesignation = v.designation?.toLowerCase().includes(q);
        const matchBranch = v.assignedBranchName?.toLowerCase().includes(q);
        const matchAgent = v.ownerName?.toLowerCase().includes(q) || v.assignAgent?.toLowerCase().includes(q);
        if (!matchName && !matchCompany && !matchPhone && !matchEmail && !matchDesignation && !matchBranch && !matchAgent) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "All") {
        const s = v.clientVisitStatus || "Live";
        if (s !== statusFilter) return false;
      }

      // Branch
      if (branchFilter !== "All") {
        if (v.assignedBranchId !== branchFilter && v.assignedBranchName !== branchFilter) return false;
      }

      // Agent
      if (agentFilter !== "All") {
        if (v.ownerId !== agentFilter) return false;
      }

      return true;
    });
  }, [visits, search, statusFilter, branchFilter, agentFilter]);

  // Summary Metrics
  const totalVolume = useMemo(() => {
    return visits.reduce((acc, v) => acc + (Number(v.yearlyVolume) || 0), 0);
  }, [visits]);

  const liveCount = visits.filter((v) => (v.clientVisitStatus || "Live") === "Live").length;
  const inProgressCount = visits.filter((v) => v.clientVisitStatus === "Disc in progress").length;
  const convertedCount = visits.filter((v) => v.clientVisitStatus === "Converted").length;
  const notInterestedCount = visits.filter((v) => v.clientVisitStatus === "Not interested").length;

  // Open Add Modal
  function handleOpenAdd() {
    setFormName("");
    setFormCompany("");
    setFormDesignation("");
    setFormPhone("");
    setFormEmail("");
    setFormYearlyVolume("");
    setFormRateCN("");
    setFormRateCard("");
    setFormRateTTDD("");
    setFormNextFollowUp("");
    setFormStatus("Live");
    setFormAgentId(users[0]?.id || "");
    setFormBranchId(branches[0]?.id || "");
    setFormFeedback("");
    setFormError("");
    setIsAddOpen(true);
  }

  // Open Edit Modal
  function handleOpenEdit(visit: ClientVisitLead) {
    setEditingVisit(visit);
    setFormName(visit.name || "");
    setFormCompany(visit.companyName || "");
    setFormDesignation(visit.designation || "");
    setFormPhone(visit.phone || "");
    setFormEmail(visit.email || "");
    setFormYearlyVolume(visit.yearlyVolume ?? "");
    setFormRateCN(visit.rateOfferedCN ?? "");
    setFormRateCard(visit.rateOfferedCard ?? "");
    setFormRateTTDD(visit.rateOfferedTTDD ?? "");
    setFormNextFollowUp(visit.nextFollowUp || "");
    setFormStatus(visit.clientVisitStatus || "Live");
    setFormAgentId(visit.ownerId || "");
    setFormBranchId(visit.assignedBranchId || "");
    setFormFeedback(visit.feedback || visit.notes || "");
    setFormError("");
  }

  // Save Add
  async function handleSaveNew() {
    if (!formName.trim()) {
      setFormError("Contact person name is required.");
      return;
    }
    const cleanDigits = formPhone.replace(/\D/g, "");
    if (formPhone.trim() && cleanDigits.length !== 10) {
      setFormError("Phone number must be exactly 10 digits.");
      return;
    }

    setSaving(true);
    setFormError("");

    const branchObj = branches.find((b) => b.id === formBranchId);
    const agentObj = users.find((u) => u.id === formAgentId);

    try {
      const res = await fetch("/api/client-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          companyName: formCompany.trim(),
          designation: formDesignation.trim(),
          phone: cleanDigits,
          email: formEmail.trim(),
          yearlyVolume: Number(formYearlyVolume) || 0,
          rateOfferedCN: Number(formRateCN) || 0,
          rateOfferedCard: Number(formRateCard) || 0,
          rateOfferedTTDD: Number(formRateTTDD) || 0,
          nextFollowUp: formNextFollowUp,
          clientVisitStatus: formStatus,
          ownerId: formAgentId || undefined,
          assignedBranchId: branchObj?.id,
          assignedBranchName: branchObj?.name,
          feedback: formFeedback,
          notes: formFeedback,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create client visit.");
      }

      if (data.clientVisit) {
        const created: ClientVisitLead = {
          ...data.clientVisit,
          ownerName: agentObj?.name || data.clientVisit.ownerName,
        };
        setVisits((prev) => [created, ...prev]);
      }
      setIsAddOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  // Save Edit
  async function handleSaveEdit() {
    if (!editingVisit) return;
    if (!formName.trim()) {
      setFormError("Contact person name is required.");
      return;
    }
    const cleanDigits = formPhone.replace(/\D/g, "");
    if (formPhone.trim() && cleanDigits.length !== 10) {
      setFormError("Phone number must be exactly 10 digits.");
      return;
    }

    setSaving(true);
    setFormError("");

    const branchObj = branches.find((b) => b.id === formBranchId);
    const agentObj = users.find((u) => u.id === formAgentId);

    try {
      const res = await fetch(`/api/client-visits/${editingVisit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          companyName: formCompany.trim(),
          designation: formDesignation.trim(),
          phone: cleanDigits,
          email: formEmail.trim(),
          yearlyVolume: Number(formYearlyVolume) || 0,
          rateOfferedCN: Number(formRateCN) || 0,
          rateOfferedCard: Number(formRateCard) || 0,
          rateOfferedTTDD: Number(formRateTTDD) || 0,
          nextFollowUp: formNextFollowUp,
          clientVisitStatus: formStatus,
          ownerId: formAgentId || undefined,
          assignedBranchId: branchObj?.id,
          assignedBranchName: branchObj?.name,
          feedback: formFeedback,
          notes: formFeedback,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update client visit.");
      }

      setVisits((prev) =>
        prev.map((v) =>
          v.id === editingVisit.id
            ? {
                ...v,
                name: formName.trim(),
                companyName: formCompany.trim(),
                designation: formDesignation.trim(),
                phone: cleanDigits,
                email: formEmail.trim(),
                yearlyVolume: Number(formYearlyVolume) || 0,
                rateOfferedCN: Number(formRateCN) || 0,
                rateOfferedCard: Number(formRateCard) || 0,
                rateOfferedTTDD: Number(formRateTTDD) || 0,
                nextFollowUp: formNextFollowUp,
                clientVisitStatus: formStatus,
                ownerId: formAgentId,
                ownerName: agentObj?.name || v.ownerName,
                assignedBranchId: branchObj?.id || v.assignedBranchId,
                assignedBranchName: branchObj?.name || v.assignedBranchName,
                feedback: formFeedback,
                notes: formFeedback,
              }
            : v
        )
      );
      setEditingVisit(null);
    } catch (err: any) {
      setFormError(err.message || "Failed to update.");
    } finally {
      setSaving(false);
    }
  }

  // Quick Status Change
  async function handleQuickStatusChange(id: string, newStatus: string) {
    // Optimistic update
    setVisits((prev) =>
      prev.map((v) => (v.id === id ? { ...v, clientVisitStatus: newStatus } : v))
    );

    try {
      await fetch(`/api/client-visits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientVisitStatus: newStatus }),
      });
    } catch {}
  }

  // Delete Visit
  async function handleConfirmDelete() {
    if (!deleteId) return;
    const targetId = deleteId;
    setVisits((prev) => prev.filter((v) => v.id !== targetId));
    setDeleteId(null);

    try {
      await fetch(`/api/client-visits/${targetId}`, {
        method: "DELETE",
      });
    } catch {}
  }

  // Export CSV
  function handleExportCSV() {
    const headers = [
      "ID",
      "Company",
      "Contact Person",
      "Designation",
      "Phone",
      "Email",
      "Status",
      "Annual Volume (INR)",
      "CN Rate",
      "Card Rate",
      "TT/DD Rate",
      "Next Follow-Up",
      "Branch",
      "Executive",
      "Feedback / Notes",
      "Created Date",
    ];

    const rows = filteredVisits.map((v) => [
      v.id,
      `"${(v.companyName || "").replace(/"/g, '""')}"`,
      `"${(v.name || "").replace(/"/g, '""')}"`,
      `"${(v.designation || "").replace(/"/g, '""')}"`,
      v.phone || "",
      v.email || "",
      v.clientVisitStatus || "Live",
      v.yearlyVolume || 0,
      v.rateOfferedCN || 0,
      v.rateOfferedCard || 0,
      v.rateOfferedTTDD || 0,
      v.nextFollowUp || "",
      `"${(v.assignedBranchName || "").replace(/"/g, '""')}"`,
      `"${(v.ownerName || v.assignAgent || "").replace(/"/g, '""')}"`,
      `"${(v.feedback || v.notes || "").replace(/"/g, '""')}"`,
      v.createdAt || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `client_visits_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-bold border border-rose-200/60 shadow-2xs">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
                Client Visits & Corporate Accounts
              </h1>
            </div>
            <p className="mt-2 text-xs text-zinc-500 sm:text-sm font-medium max-w-2xl">
              Track in-person corporate client visits, client meeting feedback, currency & card rates offered, and follow-ups across all branches.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors shadow-2xs"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-rose-600/20 hover:from-rose-500 hover:to-rose-600 active:scale-95 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Log Client Visit
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Metric Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 sm:gap-4">
        {/* Total Visits */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Visits</p>
          <p className="mt-1.5 text-2xl font-black text-zinc-900 tabular-nums">{visits.length}</p>
          <p className="mt-1 text-[11px] font-medium text-zinc-400">All registered meetings</p>
        </div>

        {/* Live */}
        <div className="rounded-2xl border border-blue-200/60 bg-blue-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Live</p>
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-blue-900 tabular-nums">{liveCount}</p>
          <p className="mt-1 text-[11px] font-medium text-blue-600/80">Active relationships</p>
        </div>

        {/* In Discussion */}
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">In Discussion</p>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-amber-900 tabular-nums">{inProgressCount}</p>
          <p className="mt-1 text-[11px] font-medium text-amber-600/80">Negotiation ongoing</p>
        </div>

        {/* Converted */}
        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Converted</p>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-emerald-900 tabular-nums">{convertedCount}</p>
          <p className="mt-1 text-[11px] font-medium text-emerald-600/80">Won accounts</p>
        </div>

        {/* Not Interested */}
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Not Interested</p>
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-zinc-700 tabular-nums">{notInterestedCount}</p>
          <p className="mt-1 text-[11px] font-medium text-zinc-400">Closed / deferred</p>
        </div>

        {/* Total Annual Volume */}
        <div className="rounded-2xl border border-rose-200/60 bg-rose-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Annual Volume</p>
            <span className="h-2 w-2 rounded-full bg-rose-500" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-rose-900 tabular-nums truncate">{formatINR(totalVolume)}</p>
          <p className="mt-1 text-[11px] font-medium text-rose-600/80">Client pipeline volume</p>
        </div>
      </div>

      {/* ── Filters & Search Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, contact person, phone..."
            className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 pl-10 pr-3.5 py-2 text-xs font-semibold text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all"
          />
        </div>

        {/* Dropdowns & Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100/70 focus:outline-none"
          >
            <option value="All">All Statuses ({visits.length})</option>
            {CLIENT_VISIT_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          {branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100/70 focus:outline-none"
            >
              <option value="All">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Agent Filter */}
          {users.length > 0 && (
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100/70 focus:outline-none"
            >
              <option value="All">All Executives</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          {/* Kanban / Table Toggle */}
          <div className="flex items-center rounded-xl bg-zinc-100 p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === "table"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="Table View"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="Kanban View"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="18" rx="1.5" />
                <rect x="14" y="3" width="7" height="18" rx="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main View Area: Table or Kanban ──────────────────────────────────── */}
      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200/80 bg-zinc-50/70 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3.5">Company / Firm</th>
                  <th className="px-4 py-3.5">Contact Person</th>
                  <th className="px-4 py-3.5">Phone & Email</th>
                  <th className="px-4 py-3.5">Visit Status</th>
                  <th className="px-4 py-3.5">Annual Volume</th>
                  <th className="px-4 py-3.5">Rates Offered</th>
                  <th className="px-4 py-3.5">Next Follow-Up</th>
                  <th className="px-4 py-3.5">Branch / Exec</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                        </span>
                        <p className="text-sm font-bold text-zinc-700">No client visits match criteria</p>
                        <p className="text-xs text-zinc-400">Click &ldquo;Log Client Visit&rdquo; to add a corporate meeting record.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((v) => {
                    const statusKey = v.clientVisitStatus || "Live";
                    const statusMeta = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.Live;

                    return (
                      <tr key={v.id} className="hover:bg-zinc-50/70 transition-colors group">
                        {/* Company */}
                        <td className="px-4 py-3 font-bold text-zinc-900">
                          <div>
                            <p className="truncate max-w-[180px]">{v.companyName || "—"}</p>
                            {v.feedback && (
                              <p className="mt-0.5 text-[11px] font-normal text-zinc-400 line-clamp-1 max-w-[200px]" title={v.feedback}>
                                {v.feedback}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Contact Person */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-800">{v.name}</div>
                          {v.designation && <div className="text-[10.5px] text-zinc-400">{v.designation}</div>}
                        </td>

                        {/* Phone & Email */}
                        <td className="px-4 py-3">
                          {v.phone ? (
                            <a
                              href={`tel:${v.phone}`}
                              className="font-mono text-zinc-700 hover:text-rose-600 transition-colors flex items-center gap-1"
                            >
                              <span>📞</span> {v.phone}
                            </a>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                          {v.email && (
                            <div className="text-[10.5px] text-zinc-400 truncate max-w-[150px]">{v.email}</div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <select
                            value={statusKey}
                            onChange={(e) => handleQuickStatusChange(v.id, e.target.value)}
                            className={`rounded-lg px-2 py-1 text-[11px] font-bold border ${statusMeta.badge} cursor-pointer focus:outline-none`}
                          >
                            {CLIENT_VISIT_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Annual Volume */}
                        <td className="px-4 py-3 font-mono font-bold text-zinc-900">
                          {formatINR(v.yearlyVolume)}
                        </td>

                        {/* Rates Offered */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 text-[10.5px]">
                            {v.rateOfferedCN ? (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 border border-emerald-200/60" title="Currency Notes Rate">
                                CN: {v.rateOfferedCN}
                              </span>
                            ) : null}
                            {v.rateOfferedCard ? (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700 border border-blue-200/60" title="Forex Card Rate">
                                Card: {v.rateOfferedCard}
                              </span>
                            ) : null}
                            {v.rateOfferedTTDD ? (
                              <span className="rounded bg-purple-50 px-1.5 py-0.5 font-semibold text-purple-700 border border-purple-200/60" title="TT / DD Rate">
                                TT: {v.rateOfferedTTDD}
                              </span>
                            ) : null}
                            {!v.rateOfferedCN && !v.rateOfferedCard && !v.rateOfferedTTDD && (
                              <span className="text-zinc-300">—</span>
                            )}
                          </div>
                        </td>

                        {/* Next Follow Up */}
                        <td className="px-4 py-3 text-zinc-600">
                          {v.nextFollowUp ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                              📅 {v.nextFollowUp}
                            </span>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>

                        {/* Branch / Exec */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-700 truncate max-w-[130px]">
                            {v.assignedBranchName || "Main Branch"}
                          </div>
                          <div className="text-[10.5px] text-zinc-400 truncate max-w-[130px]">
                            {v.ownerName || v.assignAgent || "Unassigned"}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(v)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                              title="Edit Client Visit"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteId(v.id)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete Client Visit"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {CLIENT_VISIT_STAGES.map((stg) => {
            const colVisits = filteredVisits.filter((v) => (v.clientVisitStatus || "Live") === stg);
            const colVol = colVisits.reduce((acc, v) => acc + (Number(v.yearlyVolume) || 0), 0);
            const meta = STATUS_CONFIG[stg] ?? STATUS_CONFIG.Live;

            return (
              <div
                key={stg}
                className={`flex flex-col rounded-2xl border border-zinc-200/90 bg-zinc-50/50 p-3.5 shadow-2xs border-t-4 ${meta.border}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                    <h3 className="text-xs font-bold text-zinc-900">{stg}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-black text-zinc-700 border border-zinc-200 shadow-2xs">
                      {colVisits.length}
                    </span>
                  </div>
                </div>

                {/* Sub-header volume */}
                <div className="py-2 text-[11px] font-semibold text-zinc-400">
                  Volume: <span className="font-bold text-zinc-700">{formatINR(colVol)}</span>
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[650px] pt-1">
                  {colVisits.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">
                      No visits in this stage
                    </div>
                  ) : (
                    colVisits.map((v) => (
                      <div
                        key={v.id}
                        className="group relative rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-zinc-900">{v.companyName || "Unnamed Firm"}</h4>
                            <p className="text-[11px] font-medium text-zinc-500">
                              {v.name} {v.designation ? `· ${v.designation}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => handleOpenEdit(v)}
                            className="text-zinc-400 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100"
                            title="Edit"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                        </div>

                        {/* Phone & Next Follow-Up */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
                          {v.phone ? (
                            <a href={`tel:${v.phone}`} className="font-mono hover:text-rose-600">
                              📞 {v.phone}
                            </a>
                          ) : (
                            <span />
                          )}
                          <span className="font-mono font-bold text-zinc-800">{formatINR(v.yearlyVolume)}</span>
                        </div>

                        {/* Rates badge */}
                        {(v.rateOfferedCN || v.rateOfferedCard || v.rateOfferedTTDD) ? (
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            {v.rateOfferedCN ? (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-emerald-700 font-semibold border border-emerald-200/60">
                                CN: {v.rateOfferedCN}
                              </span>
                            ) : null}
                            {v.rateOfferedCard ? (
                              <span className="rounded bg-blue-50 px-1.5 py-0.2 text-blue-700 font-semibold border border-blue-200/60">
                                Card: {v.rateOfferedCard}
                              </span>
                            ) : null}
                            {v.rateOfferedTTDD ? (
                              <span className="rounded bg-purple-50 px-1.5 py-0.2 text-purple-700 font-semibold border border-purple-200/60">
                                TT: {v.rateOfferedTTDD}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Next Follow Up Date */}
                        {v.nextFollowUp && (
                          <div className="flex items-center gap-1 text-[10.5px] font-semibold text-amber-800 bg-amber-50/80 rounded px-1.5 py-0.5">
                            <span>📅 Next:</span> {v.nextFollowUp}
                          </div>
                        )}

                        {/* Feedback preview */}
                        {v.feedback && (
                          <p className="text-[10.5px] text-zinc-400 line-clamp-2 italic" title={v.feedback}>
                            &ldquo;{v.feedback}&rdquo;
                          </p>
                        )}

                        {/* Footer agent / branch */}
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-50 text-[10px] text-zinc-400">
                          <span>{v.assignedBranchName || "Main"}</span>
                          <span>{v.ownerName || v.assignAgent || "Unassigned"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Visit Modal ───────────────────────────────────────────── */}
      {(isAddOpen || editingVisit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-zinc-200 my-8 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
              <h3 className="text-base font-bold text-zinc-900">
                {isAddOpen ? "Log New Client Visit" : "Edit Client Visit Record"}
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingVisit(null);
                }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Contact Name */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Contact Person Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Company / Firm Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Acme Tours & Travels Ltd"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Designation / Role</label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="e.g. Travel Desk Manager"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Phone (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. ramesh@acme.com"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Annual Volume */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Annual Volume (INR)</label>
                  <input
                    type="number"
                    value={formYearlyVolume}
                    onChange={(e) => setFormYearlyVolume(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 5000000"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>
              </div>

              {/* Rates Offered Group */}
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Rates Offered to Client</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Currency Notes (CN)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formRateCN}
                      onChange={(e) => setFormRateCN(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 86.80"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Forex Card Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formRateCard}
                      onChange={(e) => setFormRateCard(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 86.40"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">TT / DD Remittance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formRateTTDD}
                      onChange={(e) => setFormRateTTDD(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 86.20"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Next Follow-Up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Visit Stage / Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    {CLIENT_VISIT_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={formNextFollowUp}
                    onChange={(e) => setFormNextFollowUp(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Branch & Executive Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Assigned Branch</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Assigned Executive</label>
                  <select
                    value={formAgentId}
                    onChange={(e) => setFormAgentId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Select Executive</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.company || "Executive"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Feedback / Meeting Notes */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Meeting Feedback / Discussion Notes</label>
                <textarea
                  rows={3}
                  value={formFeedback}
                  onChange={(e) => setFormFeedback(e.target.value)}
                  placeholder="Key discussion points, requirement details, next action..."
                  className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs font-medium focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingVisit(null);
                }}
                disabled={saving}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={isAddOpen ? handleSaveNew : handleSaveEdit}
                disabled={saving}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : isAddOpen ? "Log Visit" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ───────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200 space-y-4">
            <h4 className="text-sm font-bold text-zinc-900">Delete Client Visit?</h4>
            <p className="text-xs text-zinc-500">
              Are you sure you want to delete this client visit record? It will be moved to trash.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
