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
  const totalRevenue = totalPayments + totalOtc;

  // Leads per user owner
  const ownerLeadCount: Record<string, number> = {};
  for (const l of leads) ownerLeadCount[l.ownerId] = (ownerLeadCount[l.ownerId] ?? 0) + 1;
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

  const completedCount = (stageCount["Confirmed"] ?? 0) + (stageCount["Closed"] ?? 0);
  const conversionRate = totalLeads > 0 ? Math.round((completedCount / totalLeads) * 100) : 0;

  function fmt(v: number) {
    if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
    if (v >= 1_00_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v}`;
  }

  const STAGE_META: Record<string, { dot: string; bar: string; text: string }> = {
    Initial:   { dot: "bg-blue-500",   bar: "bg-gradient-to-r from-blue-500 to-indigo-500", text: "text-blue-700" },
    Connected: { dot: "bg-amber-500",  bar: "bg-gradient-to-r from-amber-500 to-orange-500", text: "text-amber-700" },
    Confirmed: { dot: "bg-emerald-500",bar: "bg-gradient-to-r from-emerald-500 to-teal-500", text: "text-emerald-700" },
    Closed:    { dot: "bg-red-500",    bar: "bg-gradient-to-r from-red-500 to-rose-600", text: "text-red-700" },
  };

  const CHANNEL_META: Record<string, { badge: string; icon: string }> = {
    WhatsApp:     { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", icon: "💬" },
    Instagram:    { badge: "bg-pink-50 text-pink-700 border-pink-200/80", icon: "📸" },
    Ads:          { badge: "bg-purple-50 text-purple-700 border-purple-200/80", icon: "📢" },
    Email:        { badge: "bg-blue-50 text-blue-700 border-blue-200/80", icon: "✉️" },
    "Referral/Others": { badge: "bg-amber-50 text-amber-700 border-amber-200/80", icon: "🤝" },
  };

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

  const STATS = [
    {
      label: "Total System Leads",
      value: String(totalLeads),
      sub: `+${newThisWeek} added this week`,
      gradient: "from-blue-500/10 to-transparent",
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20",
      accent: "bg-blue-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Registered Users",
      value: String(totalUsers),
      sub: "active user accounts",
      gradient: "from-purple-500/10 to-transparent",
      iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-500/20",
      accent: "bg-purple-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 1 0 7.75" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Completed Deals",
      value: String(completedCount),
      sub: `${conversionRate}% win conversion`,
      gradient: "from-emerald-500/10 to-transparent",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20",
      accent: "bg-emerald-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
        </svg>
      ),
    },
    {
      label: "Total Collected Revenue",
      value: fmt(totalRevenue),
      sub: "payments & OTC total",
      gradient: "from-amber-500/10 to-transparent",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20",
      accent: "bg-amber-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round"/>
        </svg>
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
              Live overview across all user accounts and platform activity. You have <span className="text-emerald-700 font-bold">{totalLeads} total leads</span> across <span className="text-emerald-700 font-bold">{totalUsers} active users</span>.
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs hover:border-zinc-300 hover:shadow-md transition-all duration-200"
          >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${stat.gradient}`} />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-md ${stat.iconBg}`}>
                {stat.icon}
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${stat.accent} shadow-2xs`} />
            </div>

            <div className="relative z-10 space-y-1">
              <p className="text-2xl font-black text-zinc-900 tracking-tight">{stat.value}</p>
              <p className="text-xs font-bold text-zinc-700">{stat.label}</p>
              <p className="text-[11px] font-medium text-zinc-400 pt-0.5">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pipeline Breakdown & Lead Sources Grid ──────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Pipeline Breakdown */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </span>
                Global Pipeline Breakdown
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">{totalLeads} total leads across 4 pipeline stages</p>
            </div>
          </div>

          <div className="space-y-4">
            {STAGES.map((stage) => {
              const count = stageCount[stage] ?? 0;
              const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
              const meta = STAGE_META[stage] ?? STAGE_META["Initial"];
              return (
                <div key={stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-800 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                      {stage}
                    </span>
                    <span className="text-zinc-900 font-extrabold">
                      {count} <span className="font-normal text-zinc-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${meta.bar}`}
                      style={{ width: `${Math.max(count > 0 ? 4 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Sources / Channels */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
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
          </div>

          <div className="space-y-3">
            {Object.entries(channelCount).sort((a, b) => b[1] - a[1]).map(([channel, count]) => {
              const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
              const badgeInfo = CHANNEL_META[channel] ?? { badge: "bg-zinc-100 text-zinc-700 border-zinc-200", icon: "📌" };

              return (
                <div key={channel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold border ${badgeInfo.badge}`}>
                      <span>{badgeInfo.icon}</span>
                      {channel}
                    </span>
                    <span className="text-zinc-900 font-extrabold">
                      {count} <span className="font-normal text-zinc-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${Math.max(count > 0 ? 4 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: Top Branches + Recent Activity ────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top Branches */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900">User Accounts Leaderboard</h2>
              <p className="text-xs text-zinc-400">Top user accounts ranked by lead volume</p>
            </div>
            <Link href="/admin/users" className="text-xs font-bold text-emerald-700 hover:underline">
              All Users →
            </Link>
          </div>

          <div className="space-y-2">
            {topUsers.map((user, idx) => (
              <div key={user.id} className="flex items-center gap-3 rounded-xl p-2.5 bg-zinc-50/60 border border-zinc-200/60 hover:bg-zinc-100/60 transition-colors">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-zinc-200 text-xs font-black text-zinc-700">
                  {idx + 1}
                </span>
                <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br ${grad(user.name)} text-xs font-black text-white shadow-2xs`}>
                  {initials(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-zinc-900">{user.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{user.company || user.email}</p>
                </div>
                <span className="flex-none text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                  {user.count} Leads
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Lead Activity */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Recent Lead Submissions</h2>
              <p className="text-xs text-zinc-400">Latest activity across CRM network</p>
            </div>
            <Link href="/admin/leads" className="text-xs font-bold text-emerald-700 hover:underline">
              View All →
            </Link>
          </div>

          <div className="space-y-2">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between gap-3 rounded-xl p-2.5 bg-zinc-50/60 border border-zinc-200/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-zinc-900">{lead.name}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{lead.channel} · {formatRelativeTime(lead.createdAt)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                  lead.stage === "Closed"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : lead.stage === "Confirmed"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : lead.stage === "Connected"
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-blue-100 text-blue-700 border-blue-200"
                }`}>
                  {lead.stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
