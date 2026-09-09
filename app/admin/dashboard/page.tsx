import { getAllLeads, getAllUsers } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";
import { STAGES } from "@/lib/constants";

import { HeaderDate } from "@/app/dashboard/GreetingText";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [leads, users] = await Promise.all([getAllLeads(), getAllUsers()]);

  // ── Compute stats ──────────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const totalUsers = users.length;

  const stageCount: Record<string, number> = {};
  for (const l of leads) stageCount[l.stage] = (stageCount[l.stage] ?? 0) + 1;

  const channelCount: Record<string, number> = {};
  for (const l of leads) channelCount[l.channel] = (channelCount[l.channel] ?? 0) + 1;

  const totalPayments = leads.reduce((sum, l) =>
    sum + (l.firstPayment ?? 0) + (l.secondPayment ?? 0) + (l.thirdPaymentAmount ?? 0), 0
  );
  const totalOtc = leads.reduce((sum, l) => sum + (l.otcAmount ?? 0), 0);
  const totalDealValue = leads.reduce((sum, l) => sum + (l.value ?? 0), 0);
  const totalRevenue = totalPayments + totalOtc;
  const effectiveRevenue = totalRevenue > 0 ? totalRevenue : totalDealValue;
  const activeInPipeline = (stageCount["Initial"] ?? 0) + (stageCount["Connected"] ?? 0);

  // Leads per user owner
  const ownerLeadCount: Record<string, number> = {};
  for (const l of leads) ownerLeadCount[l.ownerId] = (ownerLeadCount[l.ownerId] ?? 0) + 1;
  const activeLeadAgents = users.filter((u) => (ownerLeadCount[u.id] ?? 0) > 0).length;
  const topUsers = users
    .map((u) => ({ ...u, count: ownerLeadCount[u.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent leads
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 7);

  // Leads created last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = leads.filter((l) => new Date(l.createdAt).getTime() >= sevenDaysAgo).length;

  const completedCount = stageCount["Confirmed"] ?? 0;
  const conversionRate = totalLeads > 0 ? Math.round((completedCount / totalLeads) * 100) : 0;

  function fmt(v: number) {
    if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
    if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v}`;
  }

  const STAGE_META: Record<string, { label: string; desc: string; dot: string; bar: string; text: string; badge: string; icon: React.ReactNode }> = {
    Initial: {
      label: "Initial Inquiries",
      desc: "Fresh leads to contact",
      dot: "bg-blue-500",
      bar: "bg-blue-500",
      text: "text-blue-700",
      badge: "bg-blue-50 text-blue-700 border-blue-200/80",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      ),
    },
    Connected: {
      label: "In Discussion",
      desc: "Actively engaged",
      dot: "bg-amber-500",
      bar: "bg-amber-500",
      text: "text-amber-700",
      badge: "bg-amber-50 text-amber-700 border-amber-200/80",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    Confirmed: {
      label: "Booking Confirmed",
      desc: "Proposal finalized",
      dot: "bg-emerald-500",
      bar: "bg-emerald-500",
      text: "text-emerald-700",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
        </svg>
      ),
    },
    Closed: {
      label: "Closed / Lost",
      desc: "Deal closed / unsuccessful",
      dot: "bg-rose-500",
      bar: "bg-rose-500",
      text: "text-rose-700",
      badge: "bg-rose-50 text-rose-700 border-rose-200/80",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
  };

  const CHANNEL_META: Record<string, { badge: string; bar: string; icon: React.ReactNode }> = {
    WhatsApp: {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      bar: "bg-emerald-500",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
    Instagram: {
      badge: "bg-pink-50 text-pink-700 border-pink-200/80",
      bar: "bg-gradient-to-r from-pink-500 to-rose-500",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      ),
    },
    Facebook: {
      badge: "bg-blue-50 text-blue-700 border-blue-200/80",
      bar: "bg-blue-600",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ),
    },
    Ads: {
      badge: "bg-purple-50 text-purple-700 border-purple-200/80",
      bar: "bg-purple-600",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 11 18-5v12L3 13v-2z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      ),
    },
    Email: {
      badge: "bg-sky-50 text-sky-700 border-sky-200/80",
      bar: "bg-sky-500",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    "Referral/Others": {
      badge: "bg-amber-50 text-amber-700 border-amber-200/80",
      bar: "bg-amber-500",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    Referral: {
      badge: "bg-amber-50 text-amber-700 border-amber-200/80",
      bar: "bg-amber-500",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  };

  const DEFAULT_CHANNEL_ICON = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  const GRADIENTS: Record<string, string> = {
    A:"from-rose-400 to-rose-600",B:"from-pink-400 to-pink-600",C:"from-fuchsia-400 to-fuchsia-600",
    D:"from-violet-400 to-violet-600",E:"from-indigo-400 to-indigo-600",F:"from-blue-400 to-blue-600",
    G:"from-sky-400 to-sky-600",H:"from-cyan-400 to-cyan-600",I:"from-teal-400 to-teal-600",
    J:"from-emerald-400 to-emerald-600",K:"from-green-400 to-green-600",
    M:"from-amber-400 to-amber-600",N:"from-orange-400 to-orange-600",
    R:"from-blue-400 to-blue-600",S:"from-sky-400 to-sky-600",
  };
  const grad = (name: string) => GRADIENTS[name[0]?.toUpperCase() ?? "A"] ?? "from-emerald-500 to-teal-600";
  const initials = (name: string) => name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  const initialCount = stageCount["Initial"] ?? 0;
  const connectedCount = stageCount["Connected"] ?? 0;
  const initialAdminPct = activeInPipeline > 0 ? Math.round((initialCount / activeInPipeline) * 100) : 0;
  const connectedAdminPct = activeInPipeline > 0 ? 100 - initialAdminPct : 0;
  const winAdminPct = totalLeads > 0 ? Math.min(100, Math.round((completedCount / totalLeads) * 100)) : 0;
  const agentCoveragePct = totalUsers > 0 ? Math.round((activeLeadAgents / totalUsers) * 100) : 0;

  const STATS = [
    {
      id: "leads",
      label: "Total System Leads",
      value: String(totalLeads),
      unit: "all sources",
      isUnitBadge: false,
      badge: (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-blue-700 border border-blue-200/70 shadow-2xs backdrop-blur-xs whitespace-nowrap shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-600 shrink-0"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          +{newThisWeek} this week
        </span>
      ),
      ambientGlow: "from-blue-500/20 to-indigo-500/5",
      iconStyle: "bg-blue-50 text-blue-600 border border-blue-200/70 shadow-2xs",
      borderHover: "hover:border-blue-300/80",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
      sparkline: (
        <svg width="40" height="20" viewBox="0 0 44 22" fill="none" className="shrink-0 text-blue-500/35 group-hover:text-blue-500/60 transition-colors">
          <path d="M2 18 L10 15 L20 17 L30 8 L42 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      footer: (
        <div className="space-y-2 pt-3 mt-1 border-t border-zinc-100/90">
          <div className="flex items-center justify-between text-[11px] sm:text-xs gap-1 min-w-0">
            <span className="text-zinc-500 font-medium truncate">Weekly Intake</span>
            <span className="font-bold text-blue-700 flex items-center gap-1 shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              {newThisWeek} new
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/40 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${totalLeads > 0 ? Math.min(100, Math.round((newThisWeek / totalLeads) * 100) * 2) : 0}%` }} />
          </div>
        </div>
      ),
    },
    {
      id: "agents",
      label: "Active Sales Agents",
      value: String(totalUsers),
      unit: "executives",
      isUnitBadge: false,
      badge: (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-purple-700 border border-purple-200/70 shadow-2xs backdrop-blur-xs whitespace-nowrap shrink-0">
          <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-purple-600"></span>
          </span>
          {agentCoveragePct}% active
        </span>
      ),
      ambientGlow: "from-purple-500/20 to-indigo-500/5",
      iconStyle: "bg-purple-50 text-purple-600 border border-purple-200/70 shadow-2xs",
      borderHover: "hover:border-purple-300/80",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      sparkline: (
        <svg width="40" height="20" viewBox="0 0 44 22" fill="none" className="shrink-0 text-purple-500/35 group-hover:text-purple-500/60 transition-colors">
          <path d="M2 17 C10 17, 14 7, 22 7 C30 7, 34 13, 42 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      footer: (
        <div className="space-y-2 pt-3 mt-1 border-t border-zinc-100/90">
          <div className="flex items-center justify-between text-[11px] sm:text-xs gap-1 min-w-0">
            <span className="text-zinc-500 font-medium truncate">Assigned Coverage</span>
            <span className="font-bold text-purple-700 shrink-0">{activeLeadAgents} of {totalUsers} agents</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/40 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${agentCoveragePct}%` }} />
          </div>
        </div>
      ),
    },
    {
      id: "deals",
      label: "Completed Deals",
      value: String(completedCount),
      unit: `of ${totalLeads} leads`,
      isUnitBadge: true,
      badge: (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 border border-emerald-200/70 shadow-2xs backdrop-blur-xs whitespace-nowrap shrink-0">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          {conversionRate}% win
        </span>
      ),
      ambientGlow: "from-emerald-500/20 to-teal-500/5",
      iconStyle: "bg-emerald-50 text-emerald-600 border border-emerald-200/70 shadow-2xs",
      borderHover: "hover:border-emerald-300/80",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
        </svg>
      ),
      sparkline: (
        <svg width="40" height="20" viewBox="0 0 44 22" fill="none" className="shrink-0 text-emerald-500/35 group-hover:text-emerald-500/60 transition-colors">
          <path d="M2 19 L12 14 L22 11 L32 7 L42 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      footer: (
        <div className="space-y-2 pt-3 mt-1 border-t border-zinc-100/90">
          <div className="flex items-center justify-between text-[11px] sm:text-xs gap-1 min-w-0">
            <span className="text-zinc-500 font-medium truncate">Org Win Rate</span>
            <span className="font-bold text-emerald-700 shrink-0">{conversionRate}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/40 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${winAdminPct}%` }} />
          </div>
        </div>
      ),
    },
    effectiveRevenue > 0
      ? {
          id: "revenue",
          label: totalRevenue > 0 ? "Total Collected Revenue" : "Total Pipeline Value",
          value: fmt(effectiveRevenue),
          unit: totalRevenue > 0 ? "payments" : "estimated",
          isUnitBadge: false,
          badge: (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-amber-700 border border-amber-200/70 shadow-2xs backdrop-blur-xs whitespace-nowrap shrink-0">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              {totalRevenue > 0 ? "Collected" : "Pipeline"}
            </span>
          ),
          ambientGlow: "from-amber-500/20 to-orange-500/5",
          iconStyle: "bg-amber-50 text-amber-600 border border-amber-200/70 shadow-2xs",
          borderHover: "hover:border-amber-300/80",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          ),
          sparkline: (
            <svg width="40" height="20" viewBox="0 0 44 22" fill="none" className="shrink-0 text-amber-500/35 group-hover:text-amber-500/60 transition-colors">
              <path d="M2 16 L12 12 L22 15 L32 6 L42 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
          footer: (
            <div className="space-y-2 pt-3 mt-1 border-t border-zinc-100/90">
              <div className="flex items-center justify-between text-[11px] sm:text-xs gap-1 min-w-0">
                <span className="text-zinc-500 font-medium truncate">{totalRevenue > 0 ? "Payments & OTC" : "Pipeline total"}</span>
                <span className="font-bold text-amber-700 shrink-0">{fmt(effectiveRevenue)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/40 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500" style={{ width: "100%" }} />
              </div>
            </div>
          ),
        }
      : {
          id: "pipeline",
          label: "Active in Pipeline",
          value: String(activeInPipeline),
          unit: "in progress",
          isUnitBadge: false,
          badge: (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-amber-700 border border-amber-200/70 shadow-2xs backdrop-blur-xs whitespace-nowrap shrink-0">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              {totalLeads > 0 ? Math.round((activeInPipeline / totalLeads) * 100) : 0}% active
            </span>
          ),
          ambientGlow: "from-amber-500/20 to-orange-500/5",
          iconStyle: "bg-amber-50 text-amber-600 border border-amber-200/70 shadow-2xs",
          borderHover: "hover:border-amber-300/80",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
          sparkline: (
            <svg width="40" height="20" viewBox="0 0 44 22" fill="none" className="shrink-0 text-amber-500/35 group-hover:text-amber-500/60 transition-colors">
              <path d="M2 14 C10 6, 18 19, 26 9 C34 3, 38 13, 42 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
          footer: (
            <div className="space-y-2 pt-3 mt-1 border-t border-zinc-100/90">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-zinc-500 gap-1 min-w-0">
                <span className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0 rounded-full bg-blue-500 ring-2 ring-blue-100" />
                  <strong className="font-bold text-zinc-800 shrink-0">{initialCount}</strong> <span className="truncate">Initial</span>
                </span>
                <span className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-100" />
                  <strong className="font-bold text-zinc-800 shrink-0">{connectedCount}</strong> <span className="truncate">Connected</span>
                </span>
              </div>
              <div className="flex h-2 w-full gap-1 rounded-full bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/40 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${initialAdminPct}%` }} title={`Initial: ${initialCount} (${initialAdminPct}%)`} />
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${connectedAdminPct}%` }} title={`Connected: ${connectedCount} (${connectedAdminPct}%)`} />
              </div>
            </div>
          ),
        },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ── Clean White Welcome Header ───────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60 shadow-2xs">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight sm:text-3xl">
                Admin Control Center
              </h1>
            </div>
            <p className="mt-2 text-xs text-zinc-500 sm:text-sm font-medium max-w-xl">
              Live overview across all sales agents and platform activity. You have <span className="text-emerald-700 font-bold">{totalLeads} total leads</span> managed across <span className="text-emerald-700 font-bold">{totalUsers} active agents</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-zinc-50 px-4 py-2.5 text-xs font-bold text-zinc-700 border border-zinc-200 shadow-2xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <HeaderDate />
            </div>

            <Link
              href="/admin/leads"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all"
            >
              All Leads Master
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Top 4 Modern Metric Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {STATS.map((stat) => (
          <div
            key={stat.id}
            className={`group relative min-w-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.02),0_4px_16px_0_rgba(0,0,0,0.02)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.08),0_4px_10px_-2px_rgba(0,0,0,0.02)] ${stat.borderHover}`}
          >
            {/* Ambient Corner Glow */}
            <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${stat.ambientGlow} blur-2xl opacity-40 group-hover:opacity-75 group-hover:scale-125 transition-all duration-500`} />

            {/* Header: Icon + Label */}
            <div className="relative z-10 flex items-center gap-2.5 min-w-0">
              <div className={`flex h-8.5 w-8.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105 ${stat.iconStyle}`}>
                {stat.icon}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 leading-tight">
                {stat.label}
              </span>
            </div>

            {/* Metric Value + Sparkline */}
            <div className="relative z-10 mt-3 sm:mt-3.5 mb-2 sm:mb-2.5 flex items-baseline justify-between gap-2 min-w-0">
              <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap min-w-0">
                <span className="text-2xl sm:text-3xl xl:text-[32px] font-black tracking-tight text-zinc-900 tabular-nums leading-none shrink-0">
                  {stat.value}
                </span>
                {stat.unit && (
                  stat.isUnitBadge ? (
                    <span className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600 border border-zinc-200/60 truncate">
                      {stat.unit}
                    </span>
                  ) : (
                    <span className="text-[11px] sm:text-xs font-semibold text-zinc-400 truncate">
                      {stat.unit}
                    </span>
                  )
                )}
              </div>
              <div className="shrink-0">
                {stat.sparkline}
              </div>
            </div>

            {/* Micro-Visualization Footer */}
            <div className="relative z-10">
              {stat.footer}
            </div>
          </div>
        ))}
      </div>

      {/* ── Pipeline Breakdown & Lead Sources Grid ──────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Global Pipeline Funnel */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  </span>
                  Global Pipeline Funnel
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">{totalLeads} total leads · {completedCount} won deals ({conversionRate}%)</p>
              </div>
              <Link
                href="/admin/leads"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors shadow-2xs"
              >
                Board View
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>

            {/* Segmented Funnel Flow Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                <span>Global Stage Distribution</span>
                <span>{totalLeads} Leads Total</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 p-0.5 ring-1 ring-zinc-200/50">
                {STAGES.map((stg) => {
                  const count = stageCount[stg] ?? 0;
                  const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                  const meta = STAGE_META[stg] ?? STAGE_META["Initial"];
                  if (count === 0) return null;
                  return (
                    <div
                      key={stg}
                      className={`h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 ${meta.bar}`}
                      style={{ width: `${pct}%` }}
                      title={`${meta.label}: ${count} (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* 4 Stage Cards in a 2x2 Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STAGES.map((stg) => {
                const count = stageCount[stg] ?? 0;
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                const meta = STAGE_META[stg] ?? STAGE_META["Initial"];

                return (
                  <div
                    key={stg}
                    className="group relative rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3.5 hover:bg-white hover:border-zinc-300 hover:shadow-xs transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border shrink-0 ${meta.badge}`}>
                          {meta.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">{meta.label}</p>
                          <p className="text-[10.5px] text-zinc-400 truncate">{meta.desc}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-bold border ${meta.badge}`}>
                        {pct}%
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between">
                      <span className="text-xl font-black tracking-tight text-zinc-900 tabular-nums">
                        {count}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-400">
                        {count === 1 ? "lead" : "leads"}
                      </span>
                    </div>

                    {/* Progress track */}
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-200/70 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${meta.bar}`}
                        style={{ width: `${Math.max(count > 0 ? 6 : 0, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>In Pipeline: <strong className="text-zinc-800 font-bold">{activeInPipeline} active</strong></span>
            <span>Total Completed: <strong className="text-emerald-700 font-bold">{completedCount} won</strong></span>
          </div>
        </div>

        {/* Lead Sources / Channels */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </span>
                  Lead Acquisition Sources
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">Channel volume breakdown across all branches</p>
              </div>
              <Link
                href="/admin/reports"
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Channel Reports →
              </Link>
            </div>

            {/* Stacked Proportional Channel Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                <span>Channel Share Mix</span>
                <span>{Object.keys(channelCount).length} Channels Active</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 p-0.5 ring-1 ring-zinc-200/50">
                {Object.entries(channelCount).sort((a, b) => b[1] - a[1]).map(([channel, count]) => {
                  const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                  const badgeInfo = CHANNEL_META[channel] ?? { badge: "bg-zinc-100 text-zinc-700 border-zinc-200", bar: "bg-zinc-500", icon: DEFAULT_CHANNEL_ICON };
                  if (count === 0) return null;
                  return (
                    <div
                      key={channel}
                      className={`h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 ${badgeInfo.bar}`}
                      style={{ width: `${pct}%` }}
                      title={`${channel}: ${count} (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Channel Rows */}
            <div className="mt-4 space-y-2.5">
              {Object.entries(channelCount).sort((a, b) => b[1] - a[1]).map(([channel, count], idx) => {
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                const badgeInfo = CHANNEL_META[channel] ?? { badge: "bg-zinc-100 text-zinc-700 border-zinc-200", bar: "bg-emerald-600", icon: DEFAULT_CHANNEL_ICON };

                return (
                  <div key={channel} className="rounded-xl border border-zinc-200/70 bg-zinc-50/40 p-2.5 space-y-1.5 hover:bg-zinc-50/80 transition-colors">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold border ${badgeInfo.badge}`}>
                          <span className="shrink-0 opacity-85">{badgeInfo.icon}</span>
                          {channel}
                        </span>
                        {idx === 0 && (
                          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200/70">
                            ★ Top Source
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-900 font-extrabold text-xs tabular-nums">
                          {count}
                        </span>
                        <span className="text-zinc-400 font-medium text-[11px]">
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-200/70 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${badgeInfo.bar}`}
                        style={{ width: `${Math.max(count > 0 ? 4 : 0, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Primary Driver: <strong className="text-zinc-800 font-bold">{Object.entries(channelCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"}</strong></span>
            <span>Total Enquiries: <strong className="text-zinc-800 font-bold">{totalLeads}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: Top Branches + Recent Activity ────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Agent Performance Leaderboard */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </span>
                  Agent Performance Leaderboard
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">Top sales agents ranked by active lead volume</p>
              </div>
              <Link href="/admin/agents" className="text-xs font-bold text-emerald-700 hover:underline">
                All Agents →
              </Link>
            </div>

            {/* Ranked Agent Cards */}
            <div className="mt-4 space-y-2.5">
              {topUsers.map((user, idx) => {
                const userPct = totalLeads > 0 ? Math.round((user.count / totalLeads) * 100) : 0;
                const isFirst = idx === 0;
                const isSecond = idx === 1;
                const isThird = idx === 2;

                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
                      isFirst
                        ? "bg-amber-50/40 border-amber-200/80 shadow-2xs"
                        : "bg-zinc-50/60 border-zinc-200/70 hover:bg-zinc-100/60"
                    }`}
                  >
                    {/* Rank Badge */}
                    <span
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-black shadow-2xs ${
                        isFirst
                          ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-2 ring-amber-200"
                          : isSecond
                          ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white ring-2 ring-slate-200"
                          : isThird
                          ? "bg-gradient-to-br from-amber-700 to-amber-900 text-white ring-2 ring-amber-100"
                          : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {/* Avatar with active indicator */}
                    <div className="relative flex-none">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${grad(user.name)} text-xs font-black text-white shadow-2xs`}>
                        {initials(user.name)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>

                    {/* Agent Details + Mini Progress */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-zinc-900">{user.name}</p>
                        <span className="flex-none text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/70">
                          {user.count} Leads
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-zinc-400 truncate">{user.company || user.email}</p>
                        <span className="text-[10.5px] font-semibold text-zinc-400 tabular-nums">
                          {userPct}% share
                        </span>
                      </div>
                      {/* Mini lead volume bar */}
                      <div className="h-1.5 rounded-full bg-zinc-200/70 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                          style={{ width: `${userPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team Performance Summary Footer (Eliminates Empty Space) */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 mt-3">
            <div className="grid grid-cols-3 divide-x divide-zinc-200/80 text-center">
              <div className="px-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Reps</p>
                <p className="text-sm font-black text-zinc-900 mt-0.5">{activeLeadAgents} / {totalUsers}</p>
              </div>
              <div className="px-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Avg / Agent</p>
                <p className="text-sm font-black text-zinc-900 mt-0.5">
                  {Math.round(totalLeads / Math.max(1, users.length))} <span className="text-[10px] font-semibold text-zinc-400">leads</span>
                </p>
              </div>
              <div className="px-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Top Performer</p>
                <p className="text-sm font-black text-emerald-700 truncate mt-0.5">
                  {topUsers[0]?.name?.split(" ")[0] ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Lead Submissions */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </span>
                  Recent Lead Submissions
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">Latest enquiry stream across CRM network</p>
              </div>
              <Link href="/admin/leads" className="text-xs font-bold text-emerald-700 hover:underline">
                View All Leads →
              </Link>
            </div>

            {/* Rich Lead Rows */}
            <div className="mt-4 space-y-2">
              {recentLeads.map((lead) => {
                const stageMeta = STAGE_META[lead.stage] ?? STAGE_META["Initial"];
                const channelMeta = CHANNEL_META[lead.channel] ?? { badge: "bg-zinc-100 text-zinc-700 border-zinc-200", bar: "bg-zinc-500", icon: DEFAULT_CHANNEL_ICON };

                return (
                  <div
                    key={lead.id}
                    className="group flex items-center justify-between gap-3 rounded-xl p-2.5 border border-zinc-200/70 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gradient-to-br ${grad(lead.name)} text-xs font-black text-white shadow-2xs`}>
                        {initials(lead.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                          {lead.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-zinc-400">
                          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 font-semibold border ${channelMeta.badge}`}>
                            <span className="shrink-0 opacity-80">{channelMeta.icon}</span>
                            {lead.channel}
                          </span>
                          <span>·</span>
                          <span className="truncate">{formatRelativeTime(lead.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold border ${stageMeta.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${stageMeta.dot}`} />
                        {lead.stage}
                      </span>
                    </div>
                  </div>
                );
              })}

              {recentLeads.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-400 italic">
                  No recent leads registered.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Incoming Weekly: <strong className="text-emerald-700 font-bold">+{newThisWeek} this week</strong></span>
            <Link href="/admin/leads" className="text-xs font-bold text-emerald-700 hover:underline">
              Open CRM Pipeline →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
