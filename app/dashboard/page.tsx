import { redirect } from "next/navigation";
import { STAGES } from "@/lib/constants";
import {
  getConversationsByOwner,
  getLeadsByOwner,
  getTasksByOwner,
  getUserById,
} from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatRelativeTime } from "@/lib/format";
import { GreetingTitle, HeaderDate } from "./GreetingText";

const stageColor: Record<string, string> = {
  Initial: "bg-gradient-to-r from-blue-500 to-indigo-500",
  Connected: "bg-gradient-to-r from-amber-500 to-orange-500",
  Completed: "bg-gradient-to-r from-emerald-500 to-teal-500",
};

const stageBadge: Record<string, string> = {
  Initial: "bg-blue-50 text-blue-700 border-blue-200/60",
  Connected: "bg-amber-50 text-amber-700 border-amber-200/60",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
};

const channelBadge: Record<string, { badge: string; icon: string }> = {
  WhatsApp: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", icon: "💬" },
  Instagram: { badge: "bg-pink-50 text-pink-700 border-pink-200/80", icon: "📸" },
  Ads: { badge: "bg-purple-50 text-purple-700 border-purple-200/80", icon: "📢" },
  Email: { badge: "bg-blue-50 text-blue-700 border-blue-200/80", icon: "✉️" },
  "Referral/Others": { badge: "bg-amber-50 text-amber-700 border-amber-200/80", icon: "🤝" },
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

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isOverdue(iso: string) {
  if (isToday(iso)) return false;
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}

function formatValue(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

const TASK_ICON_PATHS: Record<string, string[]> = {
  call: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.57 11 19.79 19.79 0 0 1 1.5 2.18 2 2 0 0 1 3.5 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.91 6.91l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"],
  email: ["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", "M22 6l-10 7L2 6"],
  meeting: ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  message: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
};

const TASK_STYLE: Record<string, { icon: string; bg: string }> = {
  call: { icon: "text-emerald-600", bg: "bg-emerald-100/80" },
  email: { icon: "text-blue-600", bg: "bg-blue-100/80" },
  meeting: { icon: "text-violet-600", bg: "bg-violet-100/80" },
  message: { icon: "text-amber-600", bg: "bg-amber-100/80" },
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user) redirect("/login");

  const [leads, conversations, tasks] = await Promise.all([
    getLeadsByOwner(user.id),
    getConversationsByOwner(user.id),
    getTasksByOwner(user.id),
  ]);

  const newLeadsCount = leads.filter(
    (l) => Date.now() - new Date(l.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;
  const activeLeads = leads.filter((l) => l.stage !== "Completed").length;
  const wonCount = leads.filter((l) => l.stage === "Completed").length;
  const conversionRate = leads.length > 0 ? ((wonCount / leads.length) * 100).toFixed(1) : "0.0";
  const totalPipelineValue = leads.reduce((s, l) => s + (l.value || 0), 0);
  const firstName = user.name.split(" ")[0];

  const todayTasks = tasks.filter((t) => !t.done && isToday(t.dueDate));
  const overdueTasks = tasks.filter((t) => !t.done && isOverdue(t.dueDate));
  const urgentTasks = [...overdueTasks, ...todayTasks].slice(0, 5);
  const tasksDoneCount = tasks.filter((t) => t.done).length;
  const unreadCount = conversations.reduce((s, c) => s + (c.unread || 0), 0);



  const STATS = [
    {
      label: "Total Pipeline Value",
      value: formatValue(totalPipelineValue),
      sub: `${leads.length} active leads & visits`,
      trend: "+14.2% this month",
      gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20",
      accent: "bg-emerald-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      ),
    },
    {
      label: "New Enquiries & Leads",
      value: String(newLeadsCount),
      sub: "Enquiries in past 7 days",
      trend: `${activeLeads} active in pipeline`,
      gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20",
      accent: "bg-blue-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: "Total Value",
      value: formatValue(totalPipelineValue),
      sub: `${leads.length} active enquiries`,
      trend: "Total potential revenue",
      gradient: "from-teal-500/10 via-teal-500/5 to-transparent",
      iconBg: "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-teal-500/20",
      accent: "bg-teal-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Tasks & Conversion",
      value: `${conversionRate}%`,
      sub: overdueTasks.length > 0 ? `${overdueTasks.length} overdue tasks` : `${todayTasks.length} due today`,
      trend: `${wonCount} deals completed`,
      gradient: "from-violet-500/10 via-violet-500/5 to-transparent",
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/20",
      accent: "bg-violet-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  const pipeline = STAGES.map((stage) => ({
    stage, count: leads.filter((l) => l.stage === stage).length, color: stageColor[stage],
  }));
  const maxCount = Math.max(1, ...pipeline.map((p) => p.count));
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 7);
  const recentMessages = [...conversations]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  // Channel breakdown metrics
  const channelCounts = [
    { channel: "WhatsApp", count: leads.filter((l) => l.channel === "WhatsApp").length, color: "bg-emerald-500" },
    { channel: "Instagram", count: leads.filter((l) => l.channel === "Instagram").length, color: "bg-pink-500" },
    { channel: "Ads", count: leads.filter((l) => l.channel === "Ads").length, color: "bg-purple-500" },
    { channel: "Email", count: leads.filter((l) => l.channel === "Email").length, color: "bg-blue-500" },
    { channel: "Referral/Others", count: leads.filter((l) => l.channel === "Referral/Others").length, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ── Clean White Header ───────────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60 shadow-2xs">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <GreetingTitle name={firstName} />
            </div>
            <p className="mt-2 text-xs text-zinc-500 sm:text-sm font-medium max-w-xl">
              Welcome back to your FX-CRM overview. You have <span className="text-emerald-700 font-bold">{leads.length} active entries</span> in your pipeline
              {unreadCount > 0 && <> and <span className="text-amber-700 font-bold">{unreadCount} unread message{unreadCount > 1 ? "s" : ""}</span></>}.
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

            <a
              href="/dashboard/leads"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all"
            >
              Leads Pipeline
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
        </div>
      </div>

      {/* ── Stat Cards Grid (Vibrant Modern Metric Cards) ────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs hover:border-zinc-300 hover:shadow-md transition-all duration-200"
          >
            {/* Soft gradient background tint on card top */}
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
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 font-medium">{stat.sub}</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  {stat.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Performance & Overview Section ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Pipeline Breakdown - 2/3 */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </span>
                Leads Pipeline Breakdown
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">{leads.length} total enquiry leads · {wonCount} completed deals</p>
            </div>
            <a href="/dashboard/leads" className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800">
              Open Board
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <div className="space-y-4">
            {pipeline.map((s) => {
              const pct = leads.length > 0 ? Math.round((s.count / leads.length) * 100) : 0;
              return (
                <div key={s.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-800 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${s.color.split(" ")[0]}`} />
                      {s.stage}
                    </span>
                    <span className="font-extrabold text-zinc-900">
                      {s.count} <span className="font-normal text-zinc-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${s.color}`}
                      style={{ width: `${Math.max(s.count > 0 ? 4 : 0, (s.count / maxCount) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Channel distribution pills */}
          <div className="pt-3 border-t border-zinc-100">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Lead Channels Breakdown</p>
            <div className="flex flex-wrap gap-2">
              {channelCounts.map((item) => (
                <div key={item.channel} className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                  <span className={`h-2 w-2 rounded-full ${item.color}`} />
                  <span>{item.channel}</span>
                  <span className="font-black text-zinc-900 bg-white px-1.5 py-0.5 rounded border border-zinc-200/80 text-[11px]">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actionable Tasks & Reminders - 1/3 */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </span>
                  Tasks &amp; Focus
                </h2>
                {overdueTasks.length > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600 border border-red-200">
                    {overdueTasks.length} Overdue
                  </span>
                )}
              </div>
              <a href="/dashboard/tasks" className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800">
                All Tasks
              </a>
            </div>

            {urgentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-700">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="text-xs font-bold text-zinc-800">All caught up!</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">No overdue or pending tasks for today</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {urgentTasks.map((task) => {
                  const overdue = isOverdue(task.dueDate);
                  const ts = TASK_STYLE[task.type] ?? TASK_STYLE.message;
                  const paths = TASK_ICON_PATHS[task.type] ?? TASK_ICON_PATHS.message;
                  return (
                    <li key={task.id} className={`rounded-xl p-2.5 transition-colors border ${overdue ? "bg-red-50/60 border-red-200/80" : "bg-zinc-50/60 border-zinc-200/60 hover:bg-zinc-100/60"}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-lg ${overdue ? "bg-red-100 text-red-600" : `${ts.bg} ${ts.icon}`}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            {paths.map((d, i) => <path key={i} d={d} strokeLinecap="round" strokeLinejoin="round" />)}
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-zinc-900">{task.title}</p>
                          <p className="truncate text-[11px] text-zinc-500 font-medium">{task.contact}</p>
                        </div>
                        {overdue && (
                          <span className="flex-none rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600">Late</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="mt-4 rounded-xl bg-zinc-50 p-3 border border-zinc-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-zinc-500">{tasksDoneCount} of {tasks.length} tasks done</span>
                <span className="text-xs font-black text-emerald-700">
                  {Math.round((tasksDoneCount / tasks.length) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${(tasksDoneCount / tasks.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Enquiries & Client Visits Stream ──────────────────────── */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/40">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Recent CRM Activity Stream</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Latest {recentLeads.length} enquiry entries</p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard/leads" className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 shadow-2xs">
              View Leads
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3">Client Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Channel</th>
                <th className="px-6 py-3">Stage / Status</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentLeads.map((lead) => {
                const channelInfo = channelBadge[lead.channel] ?? { badge: "bg-zinc-100 text-zinc-700", icon: "📌" };

                return (
                  <tr key={lead.id} className="hover:bg-teal-50/20 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br ${grad(lead.name)} text-xs font-extrabold text-white shadow-2xs`}>
                          {initials(lead.name)}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 text-sm">{lead.name}</p>
                          {lead.companyName && <p className="text-[11px] font-semibold text-zinc-500">{lead.companyName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-zinc-600">{lead.phone || "—"}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${channelInfo.badge}`}>
                        <span>{channelInfo.icon}</span>
                        {lead.channel}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${
                        stageBadge[lead.stage] ?? "bg-zinc-100 text-zinc-700"
                      }`}>
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-emerald-700">
                      {lead.value ? formatValue(lead.value) : "—"}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-zinc-400">{formatRelativeTime(lead.createdAt)}</td>
                  </tr>
                );
              })}
              {recentLeads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-zinc-400 italic">
                    No recent CRM activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
