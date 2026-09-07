"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";
import { STAGES } from "@/lib/constants";

interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  status: "active" | "suspended";
  walletBalance?: number;
  createdAt?: string;
}

interface Lead {
  id: string;
  ownerId: string;
  name: string;
  channel: string;
  value: number;
  stage: string;
  createdAt: string;
  phone?: string;
  email?: string;
  city?: string;
  assignedBranchId?: string;
  assignedBranchName?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
}

interface Props {
  initialLeads: Lead[];
  initialBranches: Branch[];
  users: User[];
}

function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Initial: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  Connected: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  Confirmed: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  Closed: { bg: "bg-rose-50 border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
};

export default function AdminBranchesClient({ initialLeads, initialBranches, users }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [activeTab, setActiveTab] = useState<"all" | "delhi" | "kolkata" | "unassigned">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal State for adding/editing branch
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [modalBranch, setModalBranch] = useState<Partial<Branch>>({
    name: "",
    city: "Delhi NCR",
    address: "",
    phone: "",
    email: "",
    status: "active",
  });
  const [isSavingBranch, setIsSavingBranch] = useState(false);

  // User lookup map
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  // Helper to categorize lead branch
  function getLeadBranchKey(l: Lead): "delhi" | "kolkata" | "unassigned" {
    const c = (l.city || "").toLowerCase();
    const bName = (l.assignedBranchName || "").toLowerCase();
    const bId = l.assignedBranchId || "";

    if (c.includes("delhi") || bName.includes("delhi") || bId.includes("delhi")) {
      return "delhi";
    }
    if (c.includes("kolkata") || bName.includes("kolkata") || bId.includes("kolkata")) {
      return "kolkata";
    }
    return "unassigned";
  }

  // Branch statistics computations
  const branchStats = useMemo(() => {
    const delhi = leads.filter((l) => getLeadBranchKey(l) === "delhi");
    const kolkata = leads.filter((l) => getLeadBranchKey(l) === "kolkata");
    const unassigned = leads.filter((l) => getLeadBranchKey(l) === "unassigned");

    const getMetrics = (list: Lead[]) => {
      const totalCount = list.length;
      const totalValue = list.reduce((sum, l) => sum + (l.value || 0), 0);
      const confirmedCount = list.filter((l) => l.stage === "Confirmed").length;
      const connectedCount = list.filter((l) => l.stage === "Connected").length;
      const initialCount = list.filter((l) => l.stage === "Initial").length;
      const closedCount = list.filter((l) => l.stage === "Closed").length;

      const channels: Record<string, number> = {};
      const owners: Record<string, number> = {};

      list.forEach((l) => {
        const ch = l.channel || "Direct";
        channels[ch] = (channels[ch] || 0) + 1;
        const oName = userMap.get(l.ownerId) || "Unassigned";
        owners[oName] = (owners[oName] || 0) + 1;
      });

      return {
        totalCount,
        totalValue,
        confirmedCount,
        connectedCount,
        initialCount,
        closedCount,
        channels,
        owners,
      };
    };

    return {
      delhi: getMetrics(delhi),
      kolkata: getMetrics(kolkata),
      unassigned: getMetrics(unassigned),
      totalLeads: leads.length,
    };
  }, [leads, userMap]);

  // Unique channels for filter dropdown
  const allChannels = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.channel) set.add(l.channel);
    });
    return Array.from(set);
  }, [leads]);

  // Filtered leads based on tab, search, stage, and channel
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const branchKey = getLeadBranchKey(lead);

      // Tab filter
      if (activeTab === "delhi" && branchKey !== "delhi") return false;
      if (activeTab === "kolkata" && branchKey !== "kolkata") return false;
      if (activeTab === "unassigned" && branchKey !== "unassigned") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          lead.name.toLowerCase().includes(q) ||
          (lead.phone && lead.phone.includes(q)) ||
          (lead.email && lead.email.toLowerCase().includes(q)) ||
          (lead.city && lead.city.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Stage filter
      if (stageFilter !== "all" && lead.stage !== stageFilter) return false;

      // Channel filter
      if (channelFilter !== "all" && lead.channel !== channelFilter) return false;

      return true;
    });
  }, [leads, activeTab, searchQuery, stageFilter, channelFilter]);

  // Reassign Lead Branch
  async function handleAssignBranch(leadId: string, targetCity: "Delhi NCR" | "Kolkata" | "") {
    setIsAssigning(leadId);
    setActionMessage(null);

    const targetBranch = branches.find((b) =>
      targetCity ? b.city.toLowerCase() === targetCity.toLowerCase() : false
    );

    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: targetCity,
          assignedBranchId: targetBranch?.id || "",
          assignedBranchName: targetBranch?.name || (targetCity ? `${targetCity} Branch` : ""),
        }),
      });

      const data = await res.json();
      if (res.ok && data.lead) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, ...data.lead } : l))
        );
        setActionMessage({
          type: "success",
          text: targetCity
            ? `Lead assigned to ${targetCity} branch successfully.`
            : "Lead moved to unassigned pool.",
        });
      } else {
        setActionMessage({
          type: "error",
          text: data.error || "Failed to update lead branch assignment.",
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.message || "Network error updating branch assignment.",
      });
    } finally {
      setIsAssigning(null);
    }
  }

  // Save or Edit Branch
  async function handleSaveBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!modalBranch.name || !modalBranch.city) return;

    setIsSavingBranch(true);
    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalBranch),
      });
      const data = await res.json();
      if (res.ok && data.branch) {
        setBranches((prev) => {
          const idx = prev.findIndex((b) => b.id === data.branch.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = data.branch;
            return copy;
          }
          return [...prev, data.branch];
        });
        setShowBranchModal(false);
        setActionMessage({ type: "success", text: `Branch "${data.branch.name}" saved successfully.` });
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to save branch." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err?.message || "Failed to save branch." });
    } finally {
      setIsSavingBranch(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Action Notification Banner ── */}
      {actionMessage && (
        <div
          className={`rounded-2xl p-4 text-xs font-semibold flex items-center justify-between border shadow-2xs ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-zinc-500 hover:text-zinc-900 cursor-pointer font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Branch Intelligence &amp; Lead Attribution
            </h1>
            <span className="rounded-full bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 border border-blue-200">
              Delhi NCR &amp; Kolkata Hubs
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Real-time inquiry distribution, pipeline volumes, and executive conversions segmented across active branch operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setModalBranch({
                name: "",
                city: "Delhi NCR",
                address: "",
                phone: "",
                email: "",
                status: "active",
              });
              setShowBranchModal(true);
            }}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Branch
          </button>
        </div>
      </div>

      {/* ── 4 Executive KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads Card */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Inquiries</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 text-xs font-bold">
              🏢
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900">{branchStats.totalLeads}</div>
          <p className="text-[11px] text-zinc-500">Across all network branches &amp; channels</p>
        </div>

        {/* Delhi NCR Card */}
        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Delhi NCR Branch</span>
            <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-extrabold border border-blue-200">
              {Math.round((branchStats.delhi.totalCount / (branchStats.totalLeads || 1)) * 100)}% Share
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-900">{branchStats.delhi.totalCount} Leads</span>
            <span className="text-xs font-semibold text-zinc-500">({formatINR(branchStats.delhi.totalValue)})</span>
          </div>
          <p className="text-[11px] text-blue-700/80 font-medium">
            {branchStats.delhi.confirmedCount} Won Deals · {branchStats.delhi.connectedCount} Connected
          </p>
        </div>

        {/* Kolkata Card */}
        <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/50 to-white p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Kolkata Branch</span>
            <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-extrabold border border-purple-200">
              {Math.round((branchStats.kolkata.totalCount / (branchStats.totalLeads || 1)) * 100)}% Share
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-900">{branchStats.kolkata.totalCount} Leads</span>
            <span className="text-xs font-semibold text-zinc-500">({formatINR(branchStats.kolkata.totalValue)})</span>
          </div>
          <p className="text-[11px] text-purple-700/80 font-medium">
            {branchStats.kolkata.confirmedCount} Won Deals · {branchStats.kolkata.connectedCount} Connected
          </p>
        </div>

        {/* Unassigned / Direct Card */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Unassigned City</span>
            <span className="rounded-full bg-zinc-100 text-zinc-700 px-2 py-0.5 text-[10px] font-bold">
              Needs Routing
            </span>
          </div>
          <div className="text-2xl font-black text-zinc-800">{branchStats.unassigned.totalCount} Leads</div>
          <p className="text-[11px] text-zinc-500">Available to assign to Delhi NCR or Kolkata</p>
        </div>
      </div>

      {/* ── Deep Dive Branch Cards: Delhi NCR & Kolkata Side-by-Side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DELHI NCR HUB CARD */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                <h2 className="text-lg font-black text-zinc-900">Delhi NCR Hub</h2>
                <span className="rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                  North Region
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Inner Circle, Connaught Place, New Delhi · Contact: +91 98100 11223
              </p>
            </div>
            <button
              onClick={() => setActiveTab("delhi")}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === "delhi"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
              }`}
            >
              View Delhi Leads ({branchStats.delhi.totalCount}) →
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-zinc-50 p-2.5 border border-zinc-100">
              <div className="text-base font-black text-zinc-900">{branchStats.delhi.totalCount}</div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Leads</div>
            </div>
            <div className="rounded-xl bg-blue-50/60 p-2.5 border border-blue-100/80">
              <div className="text-base font-black text-blue-700">{branchStats.delhi.initialCount}</div>
              <div className="text-[10px] font-bold text-blue-600 uppercase">Initial</div>
            </div>
            <div className="rounded-xl bg-amber-50/60 p-2.5 border border-amber-100/80">
              <div className="text-base font-black text-amber-700">{branchStats.delhi.connectedCount}</div>
              <div className="text-[10px] font-bold text-amber-600 uppercase">Connected</div>
            </div>
            <div className="rounded-xl bg-emerald-50/60 p-2.5 border border-emerald-100/80">
              <div className="text-base font-black text-emerald-700">🎯 {branchStats.delhi.confirmedCount}</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase">Confirmed</div>
            </div>
          </div>

          {/* Pipeline Stage Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-zinc-600">
              <span>Pipeline Stage Progression</span>
              <span>{formatINR(branchStats.delhi.totalValue)} Pipeline</span>
            </div>
            <div className="flex h-3 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div
                title={`Initial: ${branchStats.delhi.initialCount}`}
                style={{
                  width: `${(branchStats.delhi.initialCount / (branchStats.delhi.totalCount || 1)) * 100}%`,
                }}
                className="bg-blue-500 h-full"
              />
              <div
                title={`Connected: ${branchStats.delhi.connectedCount}`}
                style={{
                  width: `${(branchStats.delhi.connectedCount / (branchStats.delhi.totalCount || 1)) * 100}%`,
                }}
                className="bg-amber-500 h-full"
              />
              <div
                title={`Confirmed: ${branchStats.delhi.confirmedCount}`}
                style={{
                  width: `${(branchStats.delhi.confirmedCount / (branchStats.delhi.totalCount || 1)) * 100}%`,
                }}
                className="bg-emerald-500 h-full"
              />
              <div
                title={`Closed: ${branchStats.delhi.closedCount}`}
                style={{
                  width: `${(branchStats.delhi.closedCount / (branchStats.delhi.totalCount || 1)) * 100}%`,
                }}
                className="bg-rose-500 h-full"
              />
            </div>
          </div>

          {/* Acquisition Channels Breakdown */}
          <div className="rounded-xl bg-zinc-50/80 p-3 border border-zinc-100 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
              Acquisition Attribution Channels
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(branchStats.delhi.channels).map(([ch, count]) => (
                <span
                  key={ch}
                  className="rounded-lg bg-white border border-zinc-200/80 px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-2xs"
                >
                  <strong className="text-blue-600 font-extrabold">{count}</strong> {ch}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* KOLKATA HUB CARD */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                <h2 className="text-lg font-black text-zinc-900">Kolkata Hub</h2>
                <span className="rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                  East Region
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Park Street / Salt Lake Sector V, Kolkata · Contact: +91 98300 55443
              </p>
            </div>
            <button
              onClick={() => setActiveTab("kolkata")}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === "kolkata"
                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                  : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
              }`}
            >
              View Kolkata Leads ({branchStats.kolkata.totalCount}) →
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-zinc-50 p-2.5 border border-zinc-100">
              <div className="text-base font-black text-zinc-900">{branchStats.kolkata.totalCount}</div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Leads</div>
            </div>
            <div className="rounded-xl bg-purple-50/60 p-2.5 border border-purple-100/80">
              <div className="text-base font-black text-purple-700">{branchStats.kolkata.initialCount}</div>
              <div className="text-[10px] font-bold text-purple-600 uppercase">Initial</div>
            </div>
            <div className="rounded-xl bg-amber-50/60 p-2.5 border border-amber-100/80">
              <div className="text-base font-black text-amber-700">{branchStats.kolkata.connectedCount}</div>
              <div className="text-[10px] font-bold text-amber-600 uppercase">Connected</div>
            </div>
            <div className="rounded-xl bg-emerald-50/60 p-2.5 border border-emerald-100/80">
              <div className="text-base font-black text-emerald-700">🎯 {branchStats.kolkata.confirmedCount}</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase">Confirmed</div>
            </div>
          </div>

          {/* Pipeline Stage Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-zinc-600">
              <span>Pipeline Stage Progression</span>
              <span>{formatINR(branchStats.kolkata.totalValue)} Pipeline</span>
            </div>
            <div className="flex h-3 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div
                title={`Initial: ${branchStats.kolkata.initialCount}`}
                style={{
                  width: `${(branchStats.kolkata.initialCount / (branchStats.kolkata.totalCount || 1)) * 100}%`,
                }}
                className="bg-purple-500 h-full"
              />
              <div
                title={`Connected: ${branchStats.kolkata.connectedCount}`}
                style={{
                  width: `${(branchStats.kolkata.connectedCount / (branchStats.kolkata.totalCount || 1)) * 100}%`,
                }}
                className="bg-amber-500 h-full"
              />
              <div
                title={`Confirmed: ${branchStats.kolkata.confirmedCount}`}
                style={{
                  width: `${(branchStats.kolkata.confirmedCount / (branchStats.kolkata.totalCount || 1)) * 100}%`,
                }}
                className="bg-emerald-500 h-full"
              />
              <div
                title={`Closed: ${branchStats.kolkata.closedCount}`}
                style={{
                  width: `${(branchStats.kolkata.closedCount / (branchStats.kolkata.totalCount || 1)) * 100}%`,
                }}
                className="bg-rose-500 h-full"
              />
            </div>
          </div>

          {/* Acquisition Channels Breakdown */}
          <div className="rounded-xl bg-zinc-50/80 p-3 border border-zinc-100 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
              Acquisition Attribution Channels
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(branchStats.kolkata.channels).map(([ch, count]) => (
                <span
                  key={ch}
                  className="rounded-lg bg-white border border-zinc-200/80 px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-2xs"
                >
                  <strong className="text-purple-600 font-extrabold">{count}</strong> {ch}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Leads by Branch Explorer Table ── */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden">
        {/* Filter Navigation Tabs */}
        <div className="border-b border-zinc-200 bg-zinc-50/60 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold cursor-pointer transition-all ${
                activeTab === "all"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/80"
              }`}
            >
              All Inquiries ({branchStats.totalLeads})
            </button>
            <button
              onClick={() => setActiveTab("delhi")}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === "delhi"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              <span>🏛️ Delhi NCR</span>
              <span className="rounded-full bg-blue-100 text-blue-900 text-[10px] px-1.5 py-0.2">
                {branchStats.delhi.totalCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("kolkata")}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === "kolkata"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-200"
              }`}
            >
              <span>🌉 Kolkata</span>
              <span className="rounded-full bg-purple-100 text-purple-900 text-[10px] px-1.5 py-0.2">
                {branchStats.kolkata.totalCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("unassigned")}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === "unassigned"
                  ? "bg-zinc-700 text-white shadow-xs"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/80"
              }`}
            >
              <span>Unassigned Region</span>
              <span className="rounded-full bg-zinc-100 text-zinc-700 text-[10px] px-1.5 py-0.2">
                {branchStats.unassigned.totalCount}
              </span>
            </button>
          </div>

          {/* Quick Stats on selected tab */}
          <div className="text-xs text-zinc-500 font-medium">
            Showing <strong className="text-zinc-900">{filteredLeads.length}</strong> inquiries
          </div>
        </div>

        {/* Search and Secondary Filter Row */}
        <div className="p-4 border-b border-zinc-100 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by client name, phone, email, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 pl-9 pr-3.5 py-2 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
            <svg
              className="absolute left-3 top-2.5 text-zinc-400"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none"
          >
            <option value="all">All Pipeline Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s} Stage
              </option>
            ))}
          </select>

          {/* Channel filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none"
          >
            <option value="all">All Acquisition Channels</option>
            {allChannels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Client Name</th>
                <th className="px-4 py-3">Contact Details</th>
                <th className="px-4 py-3">Branch / Location</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3">Source Channel</th>
                <th className="px-4 py-3">Executive</th>
                <th className="px-4 py-3 text-center">Assign / Route</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-400 font-medium">
                    No leads found matching current branch or search criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const bKey = getLeadBranchKey(lead);
                  const stageStyle = STAGE_COLORS[lead.stage] || {
                    bg: "bg-zinc-100 text-zinc-700",
                    dot: "bg-zinc-400",
                  };

                  return (
                    <tr key={lead.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/leads`}
                          className="font-bold text-zinc-900 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                        >
                          <span>{lead.name}</span>
                        </Link>
                        <span className="text-[10px] text-zinc-400 font-normal">
                          {formatRelativeTime(lead.createdAt)}
                        </span>
                      </td>

                      {/* Contact Details */}
                      <td className="px-4 py-3.5 space-y-0.5">
                        <div className="font-mono text-zinc-700 font-medium">
                          {lead.phone ? `+91 ${lead.phone}` : "No phone"}
                        </div>
                        {lead.email && <div className="text-[11px] text-zinc-400 truncate max-w-[180px]">{lead.email}</div>}
                      </td>

                      {/* Branch / City Badge */}
                      <td className="px-4 py-3.5">
                        {bKey === "delhi" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                            Delhi NCR
                          </span>
                        ) : bKey === "kolkata" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200/80 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                            Kolkata
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Stage Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${stageStyle.bg}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${stageStyle.dot}`}></span>
                          {lead.stage}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="px-4 py-3.5 text-right font-bold text-zinc-900">
                        {lead.value > 0 ? (
                          formatINR(lead.value)
                        ) : (
                          <span className="text-zinc-300 font-normal">—</span>
                        )}
                      </td>

                      {/* Channel */}
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-md bg-zinc-100 border border-zinc-200/60 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                          {lead.channel}
                        </span>
                      </td>

                      {/* Assigned Owner */}
                      <td className="px-4 py-3.5 text-zinc-700 font-medium">
                        {userMap.get(lead.ownerId) || "Unassigned"}
                      </td>

                      {/* Quick Branch Reassign Dropdown */}
                      <td className="px-4 py-3.5 text-center">
                        <select
                          disabled={isAssigning === lead.id}
                          value={
                            bKey === "delhi"
                              ? "Delhi NCR"
                              : bKey === "kolkata"
                              ? "Kolkata"
                              : ""
                          }
                          onChange={(e) =>
                            handleAssignBranch(
                              lead.id,
                              e.target.value as "Delhi NCR" | "Kolkata" | ""
                            )
                          }
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-bold text-zinc-800 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none cursor-pointer disabled:opacity-50"
                        >
                          <option value="">No Branch</option>
                          <option value="Delhi NCR">📍 Delhi NCR</option>
                          <option value="Kolkata">📍 Kolkata</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Add / Edit Branch ── */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-black text-zinc-900">Add CRM Branch Location</h3>
              <button
                onClick={() => setShowBranchModal(false)}
                className="text-zinc-400 hover:text-zinc-900 cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={modalBranch.name || ""}
                  onChange={(e) => setModalBranch({ ...modalBranch, name: e.target.value })}
                  placeholder="e.g. FXPertise Delhi NCR Branch"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">City / Region *</label>
                <select
                  value={modalBranch.city || "Delhi NCR"}
                  onChange={(e) => setModalBranch({ ...modalBranch, city: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none"
                >
                  <option value="Delhi NCR">Delhi NCR</option>
                  <option value="Kolkata">Kolkata</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Bengaluru">Bengaluru</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Address</label>
                <input
                  type="text"
                  value={modalBranch.address || ""}
                  onChange={(e) => setModalBranch({ ...modalBranch, address: e.target.value })}
                  placeholder="e.g. Connaught Place, New Delhi"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={modalBranch.phone || ""}
                    onChange={(e) => setModalBranch({ ...modalBranch, phone: e.target.value })}
                    placeholder="+91 98100..."
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={modalBranch.email || ""}
                    onChange={(e) => setModalBranch({ ...modalBranch, email: e.target.value })}
                    placeholder="branch@fxpertise.in"
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBranch}
                  className="cursor-pointer rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSavingBranch ? "Saving..." : "Save Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
