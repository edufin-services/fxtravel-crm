"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Stage, STAGES } from "@/lib/constants";
import { Lead, Task, Contact } from "@/lib/db";

// ── Color and Badge Palettes ──────────────────────────────────────────────────
const STAGE_CONFIG: Record<Stage, {
  label: string;
  desc: string;
  badge: string;
  dot: string;
  bar: string;
  gradient: string;
  textColor: string;
}> = {
  Initial: {
    label: "Initial Inquiries",
    desc: "Fresh leads to contact",
    badge: "bg-blue-50 text-blue-700 border-blue-200/80",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    gradient: "from-blue-500 to-indigo-600",
    textColor: "text-blue-600",
  },
  Connected: {
    label: "In Discussion",
    desc: "Actively engaged in pipeline",
    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    gradient: "from-amber-500 to-orange-600",
    textColor: "text-amber-600",
  },
  Confirmed: {
    label: "Confirmed Won",
    desc: "Booking finalized & converted",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
    textColor: "text-emerald-600",
  },
  Closed: {
    label: "Closed / Lost",
    desc: "Unsuccessful / drop-off",
    badge: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    gradient: "from-rose-500 to-red-600",
    textColor: "text-rose-600",
  },
};

const CHANNEL_THEMES: Record<string, { badge: string; bar: string; icon: string }> = {
  WhatsApp: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500", icon: "💬" },
  Instagram: { badge: "bg-pink-50 text-pink-700 border-pink-200", bar: "bg-gradient-to-r from-pink-500 to-rose-500", icon: "📸" },
  Facebook: { badge: "bg-blue-50 text-blue-700 border-blue-200", bar: "bg-blue-600", icon: "👥" },
  Ads: { badge: "bg-purple-50 text-purple-700 border-purple-200", bar: "bg-purple-600", icon: "📢" },
  Email: { badge: "bg-sky-50 text-sky-700 border-sky-200", bar: "bg-sky-500", icon: "✉️" },
  "Referral/Others": { badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500", icon: "🤝" },
  Referral: { badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500", icon: "🤝" },
};

const GRADIENTS: Record<string, string> = {
  A: "from-rose-500 to-rose-700", B: "from-pink-500 to-pink-700", C: "from-fuchsia-500 to-fuchsia-700",
  D: "from-violet-500 to-violet-700", E: "from-indigo-500 to-indigo-700", F: "from-blue-500 to-blue-700",
  G: "from-sky-500 to-sky-700", H: "from-cyan-500 to-cyan-700", I: "from-teal-500 to-teal-700",
  J: "from-emerald-500 to-emerald-700", K: "from-green-500 to-green-700", L: "from-lime-500 to-lime-700",
  M: "from-amber-500 to-amber-700", N: "from-orange-500 to-orange-700", O: "from-red-500 to-red-700",
  P: "from-rose-500 to-rose-700", Q: "from-purple-500 to-purple-700", R: "from-blue-500 to-blue-700",
  S: "from-sky-500 to-sky-700", T: "from-teal-500 to-teal-700", U: "from-cyan-500 to-cyan-700",
  V: "from-violet-500 to-violet-700", W: "from-fuchsia-500 to-fuchsia-700", X: "from-indigo-500 to-indigo-700",
  Y: "from-amber-500 to-amber-700", Z: "from-orange-500 to-orange-700",
};
function getAvatarGrad(name: string) {
  return GRADIENTS[name[0]?.toUpperCase() ?? "A"] ?? "from-emerald-500 to-teal-700";
}
function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

export type StatsDataset = {
  label: string;
  leads: Lead[];
  contacts: Contact[];
  tasks: Task[];
};

interface StatsClientViewProps {
  isAdmin: boolean;
  userName: string;
  personalData: StatsDataset;
  orgData?: StatsDataset;
}

type Timeframe = "all" | "30d" | "thisMonth" | "90d";
type ChartMetric = "count" | "value";

export default function StatsClientView({
  isAdmin,
  userName,
  personalData,
  orgData,
}: StatsClientViewProps) {
  const [scope, setScope] = useState<"personal" | "org">(isAdmin && orgData ? "org" : "personal");
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("count");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const activeDataset = scope === "org" && orgData ? orgData : personalData;

  // ── Timeframe Filtering ───────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    const now = new Date();
    const all = activeDataset.leads;
    if (timeframe === "all") return all;

    if (timeframe === "thisMonth") {
      return all.filter((l) => {
        const d = new Date(l.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }

    const days = timeframe === "30d" ? 30 : 90;
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
    return all.filter((l) => new Date(l.createdAt).getTime() >= threshold);
  }, [activeDataset.leads, timeframe]);

  // ── Core Calculations (STRICT: Confirmed = WON, Closed = LOST) ────────────
  const totalLeads = filteredLeads.length;

  const stageBreakdown = useMemo(() => {
    const counts: Record<string, number> = { Initial: 0, Connected: 0, Confirmed: 0, Closed: 0 };
    const values: Record<string, number> = { Initial: 0, Connected: 0, Confirmed: 0, Closed: 0 };

    for (const l of filteredLeads) {
      const stg = l.stage in counts ? l.stage : "Initial";
      counts[stg] = (counts[stg] || 0) + 1;
      values[stg] = (values[stg] || 0) + (l.value || 0);
    }
    return { counts, values };
  }, [filteredLeads]);

  const confirmedCount = stageBreakdown.counts["Confirmed"] || 0;
  const closedCount = stageBreakdown.counts["Closed"] || 0;
  const inPipelineCount = (stageBreakdown.counts["Initial"] || 0) + (stageBreakdown.counts["Connected"] || 0);

  // Conversion rates
  const winRate = totalLeads > 0 ? (confirmedCount / totalLeads) * 100 : 0;
  const lossRate = totalLeads > 0 ? (closedCount / totalLeads) * 100 : 0;
  const decidedLeads = confirmedCount + closedCount;
  const outcomeWinRate = decidedLeads > 0 ? (confirmedCount / decidedLeads) * 100 : 0;

  // Financial values
  const totalPipelineValue = filteredLeads.reduce((s, l) => s + (l.value || 0), 0);
  const activePipelineValue = (stageBreakdown.values["Initial"] || 0) + (stageBreakdown.values["Connected"] || 0);
  const confirmedValue = stageBreakdown.values["Confirmed"] || 0;

  // Realized Collected Revenue (firstPayment + secondPayment + thirdPayment + otc)
  const realizedRevenue = useMemo(() => {
    return filteredLeads
      .filter((l) => l.stage === "Confirmed")
      .reduce((s, l) => {
        const payments = (l.firstPayment || 0) + (l.secondPayment || 0) + (l.thirdPaymentAmount || 0) + (l.otcAmount || 0);
        return s + (payments > 0 ? payments : (l.value || 0));
      }, 0);
  }, [filteredLeads]);

  const avgConfirmedValue = confirmedCount > 0 ? Math.round(confirmedValue / confirmedCount) : 0;

  // Recent leads velocity
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = filteredLeads.filter((l) => new Date(l.createdAt).getTime() >= sevenDaysAgo).length;

  // ── Channel Breakdown with Conversion Rates ───────────────────────────────
  const channelStats = useMemo(() => {
    const map: Record<string, { total: number; confirmed: number; closed: number; value: number; confirmedValue: number }> = {};
    for (const l of filteredLeads) {
      const ch = l.channel || "Referral/Others";
      if (!map[ch]) map[ch] = { total: 0, confirmed: 0, closed: 0, value: 0, confirmedValue: 0 };
      map[ch].total++;
      map[ch].value += l.value || 0;
      if (l.stage === "Confirmed") {
        map[ch].confirmed++;
        map[ch].confirmedValue += l.value || 0;
      } else if (l.stage === "Closed") {
        map[ch].closed++;
      }
    }

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      pctOfTotal: totalLeads > 0 ? Math.round((data.total / totalLeads) * 100) : 0,
      winRate: data.total > 0 ? Math.round((data.confirmed / data.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [filteredLeads, totalLeads]);

  // ── Monthly 6-Month Timeline ──────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const list: { key: string; label: string; count: number; value: number; confirmedCount: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      list.push({
        key,
        label: d.toLocaleString("default", { month: "short" }),
        count: 0,
        value: 0,
        confirmedCount: 0,
      });
    }

    for (const lead of activeDataset.leads) {
      const d = new Date(lead.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = list.find((m) => m.key === key);
      if (entry) {
        entry.count++;
        entry.value += lead.value || 0;
        if (lead.stage === "Confirmed") entry.confirmedCount++;
      }
    }
    const maxCount = Math.max(1, ...list.map((m) => m.count));
    const maxValue = Math.max(1, ...list.map((m) => m.value));
    return { list, maxCount, maxValue };
  }, [activeDataset.leads]);

  // ── Tasks & Operational Health ───────────────────────────────────────────
  const tasks = activeDataset.tasks;
  const completedTasks = tasks.filter((t) => t.done).length;
  const openTasks = tasks.length - completedTasks;
  const taskCompletionPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const nowTime = new Date();
  const overdueTasks = tasks.filter((t) => {
    if (t.done || !t.dueDate) return false;
    const d = new Date(t.dueDate);
    d.setHours(23, 59, 59, 999);
    return d < nowTime;
  }).length;

  // ── Top Prospect Opportunities ───────────────────────────────────────────
  const topProspects = useMemo(() => {
    return [...filteredLeads]
      .filter((l) => l.stage !== "Closed")
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 6);
  }, [filteredLeads]);

  return (
    <div className="space-y-7 pb-12 font-sans text-zinc-900">
      {/* ── Top Header & Global Scope Toolbar ──────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-2xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60 shadow-2xs">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight sm:text-3xl">
                Stats &amp; Performance Analytics
              </h1>
            </div>
            <p className="text-xs text-zinc-500 sm:text-sm font-medium max-w-2xl">
              Real-time pipeline progression, deal conversion quality, and channel ROI for{" "}
              <strong className="text-zinc-800">{scope === "org" ? "Entire Organization" : userName}</strong>.
            </p>
          </div>

          {/* Right Controls: Scope Toggle + Quick Summary */}
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && orgData && (
              <div className="inline-flex p-1 rounded-2xl bg-zinc-100/90 border border-zinc-200/80 shadow-inner">
                <button
                  onClick={() => setScope("personal")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    scope === "personal"
                      ? "bg-white text-zinc-950 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  My Portfolio
                </button>
                <button
                  onClick={() => setScope("org")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    scope === "org"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Org Wide ({orgData.leads.length})
                </button>
              </div>
            )}

            <Link
              href={scope === "org" ? "/admin/leads" : "/dashboard/leads"}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 px-4 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 transition-colors shadow-2xs cursor-pointer"
            >
              <span>View Kanban Board</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="mt-5 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">Timeframe:</span>
            <div className="flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/70">
              {[
                { id: "all", label: "All Time" },
                { id: "thisMonth", label: "This Month" },
                { id: "30d", label: "Last 30 Days" },
                { id: "90d", label: "Last 90 Days" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeframe(t.id as Timeframe)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeframe === t.id
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-zinc-700 font-bold border border-zinc-200/70">
              Filtered: <strong className="text-zinc-900">{filteredLeads.length} leads</strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 font-bold border border-emerald-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Won: <strong className="text-emerald-700">{confirmedCount}</strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-rose-800 font-bold border border-rose-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Lost: <strong className="text-rose-700">{closedCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── 6 Hero Metric KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Card 1: Total Leads */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Total Leads</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">{totalLeads}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-blue-600">
              <span>+{newThisWeek} new this week</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 font-medium truncate">
            Across {channelStats.length} marketing channels
          </div>
        </div>

        {/* Card 2: Confirmed Won Deals (Strict) */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Confirmed Won</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-300/80 shadow-2xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{confirmedCount}</div>
            <div className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-800">
              <span>{winRate.toFixed(1)}% of all leads</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-100/80 text-[11px] font-bold text-emerald-700 truncate">
            {formatINR(confirmedValue)} Confirmed Value
          </div>
        </div>

        {/* Card 3: Closed / Lost Deals (Strict) */}
        <div className="group relative overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/40 via-white to-red-50/30 p-5 shadow-xs hover:border-rose-300 hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 h-16 w-16 bg-rose-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800">Closed / Lost</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700 border border-rose-300/80 shadow-2xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">{closedCount}</div>
            <div className="mt-1 flex items-center gap-1 text-xs font-bold text-rose-800">
              <span>{lossRate.toFixed(1)}% drop-off rate</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-100/80 text-[11px] font-bold text-rose-700 truncate">
            {outcomeWinRate.toFixed(1)}% Decision Win Rate
          </div>
        </div>

        {/* Card 4: Active in Pipeline */}
        <div className="group relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Active Pipeline</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 border border-amber-300/80 shadow-2xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">{inPipelineCount}</div>
            <div className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-700">
              <span>Initial + Connected</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100/80 text-[11px] font-bold text-amber-800 truncate">
            {formatINR(activePipelineValue)} Potential Value
          </div>
        </div>

        {/* Card 5: Realized Revenue */}
        <div className="group relative overflow-hidden rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/30 p-5 shadow-xs hover:border-purple-300 hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 h-16 w-16 bg-purple-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-800">Realized Revenue</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700 border border-purple-300/80 shadow-2xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-800 tracking-tight">{formatINR(realizedRevenue)}</div>
            <div className="mt-1 flex items-center gap-1 text-xs font-bold text-purple-700">
              <span>Confirmed bookings</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-100/80 text-[11px] font-bold text-purple-700 truncate">
            Avg: {formatINR(avgConfirmedValue)} / deal
          </div>
        </div>

        {/* Card 6: Task Execution Health */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Task Execution</span>
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${taskCompletionPct >= 80 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-zinc-50 text-zinc-600 border-zinc-200"}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">{taskCompletionPct}%</div>
            <div className="mt-1 flex items-center gap-1 text-xs font-bold text-zinc-600">
              <span>{completedTasks} of {tasks.length} done</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-100 text-[11px] font-bold flex items-center justify-between">
            <span className="text-zinc-500">{openTasks} Open</span>
            {overdueTasks > 0 && (
              <span className="text-rose-600 font-black flex items-center gap-1">
                ⚠️ {overdueTasks} Overdue
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Conversion Funnel & Visual Drop-off Section ───────────────────── */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs text-xs font-black">
                ▼
              </span>
              <h2 className="text-lg font-black text-zinc-900 tracking-tight">
                Sales Pipeline Conversion Funnel
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Lead progression flow from first contact to confirmed revenue vs. dropped deals
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Initial</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Connected</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Confirmed (Won)</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Closed (Lost)</span>
          </div>
        </div>

        {/* Visual Multi-Stage Conversion Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1: Initial */}
          <div className="relative rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/50 to-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-blue-700">
                Step 1 · Top of Funnel
              </span>
              <span className="text-xs font-black text-blue-600">100%</span>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500">Initial Inquiries</p>
              <p className="text-2xl font-black text-blue-700 tracking-tight">{stageBreakdown.counts["Initial"] || 0}</p>
            </div>
            <div className="pt-2 border-t border-blue-100 text-[11px] text-zinc-500 font-medium">
              Value: <strong className="text-zinc-800">{formatINR(stageBreakdown.values["Initial"] || 0)}</strong>
            </div>
          </div>

          {/* Step 2: Connected */}
          <div className="relative rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700">
                Step 2 · Discussion
              </span>
              <span className="text-xs font-black text-amber-600">
                {totalLeads > 0 ? Math.round(((stageBreakdown.counts["Connected"] || 0) / totalLeads) * 100) : 0}%
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500">Connected &amp; Engaged</p>
              <p className="text-2xl font-black text-amber-700 tracking-tight">{stageBreakdown.counts["Connected"] || 0}</p>
            </div>
            <div className="pt-2 border-t border-amber-100 text-[11px] text-zinc-500 font-medium">
              Value: <strong className="text-zinc-800">{formatINR(stageBreakdown.values["Connected"] || 0)}</strong>
            </div>
          </div>

          {/* Step 3: Confirmed Deals (Won) */}
          <div className="relative rounded-2xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50/60 via-emerald-50/20 to-white p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-2xs">
                Won · Finalized
              </span>
              <span className="text-xs font-black text-emerald-700">{winRate.toFixed(1)}%</span>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">Confirmed Won Deals</p>
              <p className="text-2xl font-black text-emerald-700 tracking-tight">{confirmedCount}</p>
            </div>
            <div className="pt-2 border-t border-emerald-100 text-[11px] text-emerald-800 font-bold">
              Realized: <strong className="text-emerald-700">{formatINR(confirmedValue)}</strong>
            </div>
          </div>

          {/* Dropped / Lost: Closed Deals */}
          <div className="relative rounded-2xl border border-rose-200/80 bg-gradient-to-b from-rose-50/40 to-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-rose-700">
                Leakage · Dropped
              </span>
              <span className="text-xs font-black text-rose-600">{lossRate.toFixed(1)}%</span>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500">Closed / Lost Inquiries</p>
              <p className="text-2xl font-black text-rose-700 tracking-tight">{closedCount}</p>
            </div>
            <div className="pt-2 border-t border-rose-100 text-[11px] text-zinc-500 font-medium">
              Lost Potential: <strong className="text-rose-700">{formatINR(stageBreakdown.values["Closed"] || 0)}</strong>
            </div>
          </div>
        </div>

        {/* Horizontal Visual Progression Ratio Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-bold text-zinc-600">
            <span>Overall Pipeline Stage Split</span>
            <span>{totalLeads} Total CRM Leads</span>
          </div>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-zinc-100 p-0.5 ring-1 ring-zinc-200/60 shadow-inner">
            {STAGES.map((stg) => {
              const count = stageBreakdown.counts[stg] || 0;
              const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
              const meta = STAGE_CONFIG[stg];
              if (count === 0) return null;
              return (
                <div
                  key={stg}
                  className={`h-full transition-all duration-500 ${meta.bar} first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${pct}%` }}
                  title={`${meta.label}: ${count} leads (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mid Section: Monthly Trends + Channel Performance Grid ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left (7 Cols): Monthly 6-Month Velocity Bar Chart */}
        <div className="lg:col-span-7 rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </span>
                6-Month Acquisition &amp; Revenue Trends
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Historical lead volume and value trajectory</p>
            </div>

            {/* Metric Toggle: Count vs Value */}
            <div className="inline-flex p-0.5 rounded-xl bg-zinc-100 border border-zinc-200/80">
              <button
                onClick={() => setChartMetric("count")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartMetric === "count" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Lead Count
              </button>
              <button
                onClick={() => setChartMetric("value")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartMetric === "value" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Pipeline Value (₹)
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="pt-4 pb-2">
            <div className="flex h-56 items-end gap-3 sm:gap-6 px-2">
              {monthlyData.list.map((bar) => {
                const metricVal = chartMetric === "count" ? bar.count : bar.value;
                const maxVal = chartMetric === "count" ? monthlyData.maxCount : monthlyData.maxValue;
                const fillPct = Math.max(metricVal > 0 ? 12 : 4, (metricVal / maxVal) * 100);

                return (
                  <div key={bar.key} className="flex flex-1 flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-center opacity-90 group-hover:opacity-100 transition-opacity">
                      {metricVal > 0 ? (
                        <span className="inline-block text-[11px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                          {chartMetric === "count" ? bar.count : formatINR(bar.value)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-300">0</span>
                      )}
                    </div>

                    <div className="flex h-36 w-full items-end justify-center">
                      <div
                        className="w-full max-w-[48px] rounded-t-xl transition-all duration-500 group-hover:brightness-110 shadow-xs relative"
                        style={{
                          height: `${fillPct}%`,
                          background: metricVal > 0 ? "linear-gradient(to top, #059669, #10b981)" : "#f4f4f5",
                        }}
                      >
                        {bar.confirmedCount > 0 && chartMetric === "count" && (
                          <span
                            className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700 text-white text-[9px] font-bold ring-2 ring-white"
                            title={`${bar.confirmedCount} won deals`}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-center">
                      <span className="text-xs font-bold text-zinc-700">{bar.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs text-zinc-400 font-medium">
            <span>Total Historical: {activeDataset.leads.length} leads</span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Realized Deals Peak
            </span>
          </div>
        </div>

        {/* Right (5 Cols): Channel Performance & Win Rates */}
        <div className="lg:col-span-5 rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-base font-black text-zinc-900 tracking-tight">Channel Conversion Quality</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Which lead sources convert to confirmed deals</p>
            </div>
            <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg">
              {channelStats.length} Channels
            </span>
          </div>

          <div className="space-y-4">
            {channelStats.map((ch) => {
              const theme = CHANNEL_THEMES[ch.name] || CHANNEL_THEMES["Referral/Others"];
              return (
                <div
                  key={ch.name}
                  onClick={() => setSelectedChannel(selectedChannel === ch.name ? null : ch.name)}
                  className="rounded-2xl p-3 bg-zinc-50/70 border border-zinc-200/70 hover:bg-white hover:border-zinc-300 hover:shadow-2xs transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{theme.icon}</span>
                      <span className="font-bold text-xs text-zinc-900">{ch.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-800">
                        {ch.total} leads <span className="text-zinc-400 font-normal">({ch.pctOfTotal}%)</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${ch.winRate > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-500 border-zinc-200"}`}>
                        {ch.winRate}% win
                      </span>
                    </div>
                  </div>

                  {/* Channel mini progress bar */}
                  <div className="flex h-2 w-full rounded-full bg-zinc-200/70 overflow-hidden">
                    <div
                      className={`h-full ${theme.bar} transition-all duration-500`}
                      style={{ width: `${ch.pctOfTotal}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                    <span>Won: <strong className="text-emerald-700 font-bold">{ch.confirmed}</strong> | Lost: <strong className="text-rose-600 font-bold">{ch.closed}</strong></span>
                    <span className="font-bold text-zinc-700">{formatINR(ch.value)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Top Prospects + Task Execution Health ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left (7 Cols): High-Value Prospects Leaderboard */}
        <div className="lg:col-span-7 rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-black">
                  ★
                </span>
                High-Value Active Opportunities
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Top prospects currently in discussion / initial inquiry</p>
            </div>
            <Link
              href="/dashboard/leads"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              All Leads →
            </Link>
          </div>

          {topProspects.length === 0 ? (
            <p className="py-10 text-center text-xs text-zinc-400 italic">No active opportunities in this timeframe.</p>
          ) : (
            <div className="space-y-2.5">
              {topProspects.map((prospect, idx) => (
                <div
                  key={prospect.id}
                  className="flex items-center justify-between gap-3 rounded-2xl p-3 bg-zinc-50/80 border border-zinc-200/80 hover:bg-white hover:border-zinc-300 hover:shadow-2xs transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-xl bg-zinc-200 text-xs font-black text-zinc-700">
                      #{idx + 1}
                    </span>
                    <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGrad(prospect.name)} text-xs font-black text-white shadow-xs`}>
                      {getInitials(prospect.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-zinc-900">{prospect.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        <span>{prospect.channel}</span>
                        {prospect.phone && (
                          <>
                            <span>·</span>
                            <span>{prospect.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold border ${STAGE_CONFIG[prospect.stage]?.badge || "bg-zinc-100 text-zinc-700 border-zinc-200"}`}>
                      {STAGE_CONFIG[prospect.stage]?.label || prospect.stage}
                    </span>
                    <span className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-xl">
                      {formatINR(prospect.value || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right (5 Cols): Operational & Task Health */}
        <div className="lg:col-span-5 rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-base font-black text-zinc-900 tracking-tight">Operational Task Health</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Execution cadence and customer engagement</p>
            </div>
            <Link
              href="/dashboard/tasks"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Task Board →
            </Link>
          </div>

          <div className="flex items-center gap-6 pt-1">
            {/* Radial Meter */}
            <div className="relative flex h-32 w-32 flex-none items-center justify-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f4f4f5" strokeWidth="3.2" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke={taskCompletionPct >= 80 ? "#10b981" : taskCompletionPct >= 50 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="3.2"
                  strokeDasharray={`${taskCompletionPct} ${100 - taskCompletionPct}`}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="text-center">
                <p className="text-2xl font-black text-zinc-900 leading-none">{taskCompletionPct}%</p>
                <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mt-1">Done</p>
              </div>
            </div>

            {/* Task Metric Blocks */}
            <div className="flex-1 space-y-2.5">
              <div className="rounded-xl bg-emerald-50/80 p-3 border border-emerald-200/70 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-800">Completed Tasks</p>
                  <p className="text-lg font-black text-emerald-700">{completedTasks}</p>
                </div>
                <span className="text-lg">✅</span>
              </div>

              <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-700">Open Follow-ups</p>
                  <p className="text-lg font-black text-zinc-900">{openTasks}</p>
                </div>
                <span className="text-lg">⏳</span>
              </div>

              {overdueTasks > 0 && (
                <div className="rounded-xl bg-rose-50 p-2.5 border border-rose-200/80 flex items-center justify-between text-xs font-bold text-rose-700">
                  <span>⚠️ Attention Needed</span>
                  <span>{overdueTasks} Overdue</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-medium text-zinc-400">
            <span>Portfolio Contacts: <strong className="text-zinc-700">{activeDataset.contacts.length}</strong></span>
            <span>Total Tasks: <strong className="text-zinc-700">{tasks.length}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
