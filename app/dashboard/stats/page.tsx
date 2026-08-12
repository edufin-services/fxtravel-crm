import { redirect } from "next/navigation";
import { STAGES, CHANNELS } from "@/lib/constants";
import { getContactsByOwner, getLeadsByOwner, getTasksByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const channelColor: Record<string, string> = {
  WhatsApp: "bg-emerald-500",
  Instagram: "bg-pink-500",
  Ads: "bg-purple-600",
  Email: "bg-blue-500",
  "Referral/Others": "bg-amber-500",
};

const channelBg: Record<string, { badge: string; icon: string }> = {
  WhatsApp: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", icon: "💬" },
  Instagram: { badge: "bg-pink-50 text-pink-700 border-pink-200/80", icon: "📸" },
  Ads: { badge: "bg-purple-50 text-purple-700 border-purple-200/80", icon: "📢" },
  Email: { badge: "bg-blue-50 text-blue-700 border-blue-200/80", icon: "✉️" },
  "Referral/Others": { badge: "bg-amber-50 text-amber-700 border-amber-200/80", icon: "🤝" },
};

const stageColor: Record<string, string> = {
  Initial: "bg-gradient-to-r from-blue-500 to-indigo-500",
  Connected: "bg-gradient-to-r from-amber-500 to-orange-500",
  Completed: "bg-gradient-to-r from-emerald-500 to-teal-500",
};

function formatValue(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

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

export default async function StatsPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const [leads, contacts, tasks] = await Promise.all([
    getLeadsByOwner(session.userId),
    getContactsByOwner(session.userId),
    getTasksByOwner(session.userId),
  ]);

  const wonLeads = leads.filter((l) => l.stage === "Completed");
  const winRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;
  const newLeadsLast30 = leads.filter(
    (l) => Date.now() - new Date(l.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
  ).length;
  const totalPipelineValue = leads.reduce((s, l) => s + (l.value || 0), 0);
  const avgLeadValue = leads.length > 0
    ? Math.round(leads.reduce((s, l) => s + (l.value || 0), 0) / leads.length)
    : 0;
  const activeLeads = leads.filter((l) => l.stage !== "Completed").length;

  const completedTasks = tasks.filter((t) => t.done).length;
  const openTasks = tasks.length - completedTasks;
  const taskCompletionPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const STATS = [
    {
      label: "Total Leads & Enquiries",
      value: String(leads.length),
      sub: "all time CRM records",
      gradient: "from-zinc-500/10 to-transparent",
      iconBg: "bg-gradient-to-br from-zinc-800 to-zinc-900 text-white shadow-zinc-800/20",
      accent: "bg-zinc-800",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: "New Leads (30 Days)",
      value: String(newLeadsLast30),
      sub: "past 30 days added",
      gradient: "from-blue-500/10 to-transparent",
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20",
      accent: "bg-blue-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      ),
    },
    {
      label: "Deal Win Rate",
      value: `${winRate.toFixed(1)}%`,
      sub: `${wonLeads.length} completed deals`,
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
      label: "Total Pipeline Value",
      value: formatValue(totalPipelineValue),
      sub: `${activeLeads} active in pipeline`,
      gradient: "from-violet-500/10 to-transparent",
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/20",
      accent: "bg-violet-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      ),
    },
  ];

  // Monthly chart - last 6 months
  const months: { key: string; label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString(undefined, { month: "short" }), count: 0 });
  }
  for (const lead of leads) {
    const d = new Date(lead.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (m) m.count++;
  }
  const maxMonthCount = Math.max(1, ...months.map((m) => m.count));

  // Weekly trend - last 4 weeks
  const weeks: { label: string; count: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - i * 7);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - i * 7 - 6);
    startDate.setHours(0, 0, 0, 0);
    weeks.push({
      label: i === 0 ? "This wk" : i === 1 ? "Last wk" : `${i}w ago`,
      count: leads.filter((l) => {
        const t = new Date(l.createdAt).getTime();
        return t >= startDate.getTime() && t <= endDate.getTime();
      }).length,
    });
  }
  const maxWeekCount = Math.max(1, ...weeks.map((w) => w.count));

  // Channel breakdown
  const channelCounts = CHANNELS.map((ch) => ({
    name: ch,
    count: leads.filter((l) => l.channel === ch).length,
    color: channelColor[ch],
    badge: channelBg[ch] ?? { badge: "bg-zinc-100 text-zinc-700", icon: "📌" },
    pct: leads.length > 0 ? Math.round((leads.filter((l) => l.channel === ch).length / leads.length) * 100) : 0,
  }));
  const maxChannel = Math.max(1, ...channelCounts.map((c) => c.count));

  // Stage distribution
  const stageDist = STAGES.map((stage) => ({
    stage, count: leads.filter((l) => l.stage === stage).length, color: stageColor[stage],
  }));
  const maxStageDist = Math.max(1, ...stageDist.map((s) => s.count));

  // Top 5 leads by value
  const topLeads = [...leads].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5);



  return (
    <div className="space-y-6 pb-8">
      {/* ── Page Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Stats &amp; Analytics</h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-200">
              Live Reports
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            {leads.length} total leads · {contacts.length} contacts · {tasks.length} tasks recorded
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-2 shadow-2xs">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Pipeline Value</p>
              <p className="text-lg font-black text-violet-600 leading-tight mt-0.5">{formatValue(totalPipelineValue)}</p>
            </div>
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

      {/* ── Monthly Bar Chart (Leads Added by Month) ────────────────────── */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </span>
              Leads Added by Month (Last 6 Months)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Monthly lead acquisition trends in your CRM</p>
          </div>
          <span className="text-xs font-bold text-zinc-600 bg-zinc-100 px-3 py-1 rounded-xl">
            {leads.length} Total Entries
          </span>
        </div>

        <div className="flex h-52 items-end gap-3 pt-6 pb-2 px-2">
          {months.map((bar) => (
            <div key={bar.key} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
              {bar.count > 0 ? (
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 shadow-2xs">
                  {bar.count}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-300">0</span>
              )}
              <div className="flex h-36 w-full items-end">
                <div
                  className="w-full rounded-t-xl transition-all duration-500 shadow-xs"
                  style={{
                    height: `${Math.max(bar.count > 0 ? 12 : 4, (bar.count / maxMonthCount) * 100)}%`,
                    background: bar.count > 0 ? "linear-gradient(to top, #059669, #10b981)" : "#f4f4f5",
                  }}
                  title={`${bar.label}: ${bar.count} leads`}
                />
              </div>
              <span className="text-xs font-bold text-zinc-600">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Channel Performance & Stage Distribution Grid ─────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Channel Breakdown */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Leads by Channel</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Source channel distribution across CRM</p>
            </div>
          </div>

          <div className="space-y-4">
            {channelCounts.map((ch) => (
              <div key={ch.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${ch.badge.badge}`}>
                    <span>{ch.badge.icon}</span>
                    {ch.name}
                  </span>
                  <span className="text-zinc-900 font-extrabold">
                    {ch.count} <span className="font-normal text-zinc-400">({ch.pct}%)</span>
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${ch.color}`}
                    style={{ width: `${Math.max(ch.count > 0 ? 4 : 0, (ch.count / maxChannel) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage Distribution */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Pipeline Stage Distribution</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Active lead distribution across 3 stages</p>
            </div>
          </div>

          <div className="space-y-4">
            {stageDist.map((s) => {
              const pct = leads.length > 0 ? Math.round((s.count / leads.length) * 100) : 0;
              return (
                <div key={s.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-800 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${s.color.split(" ")[0]}`} />
                      {s.stage}
                    </span>
                    <span className="font-black text-zinc-900">
                      {s.count} <span className="font-normal text-zinc-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${s.color}`}
                      style={{ width: `${Math.max(s.count > 0 ? 4 : 0, (s.count / maxStageDist) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>



      {/* ── Top Leads + Task Progress ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top Leads by Value */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-3">
          <h2 className="text-base font-bold text-zinc-900">Top Prospects by Value</h2>
          <p className="text-xs text-zinc-400">Highest volume lead accounts</p>
          {topLeads.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-400 italic">No lead records yet.</p>
          ) : (
            <div className="space-y-2">
              {topLeads.map((lead, idx) => (
                <div key={lead.id} className="flex items-center gap-3 rounded-xl p-2.5 bg-zinc-50/60 border border-zinc-200/60 hover:bg-zinc-100/60 transition-colors">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-zinc-200 text-xs font-black text-zinc-700">
                    {idx + 1}
                  </span>
                  <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br ${grad(lead.name)} text-xs font-black text-white shadow-2xs`}>
                    {initials(lead.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-zinc-900">{lead.name}</p>
                    <p className="text-[11px] text-zinc-400">{lead.stage} · {lead.channel}</p>
                  </div>
                  <span className="flex-none text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                    {formatValue(lead.value || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Completion Donut */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Task Completion Rate</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Overall task execution progress</p>
          </div>
          <div className="flex items-center gap-6 pt-2">
            <div className="relative flex h-32 w-32 flex-none items-center justify-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f4f4f5" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3"
                  strokeDasharray={`${taskCompletionPct} ${100 - taskCompletionPct}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600">{taskCompletionPct}%</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Completed</p>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200/60">
                <p className="text-xl font-black text-emerald-700">{completedTasks}</p>
                <p className="text-[11px] font-bold text-emerald-800">Tasks Completed</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200/80">
                <p className="text-xl font-black text-zinc-800">{openTasks}</p>
                <p className="text-[11px] font-bold text-zinc-500">Tasks Open / Pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
