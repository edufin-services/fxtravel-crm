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
  Confirmed: "bg-gradient-to-r from-emerald-500 to-teal-500",
  Closed: "bg-gradient-to-r from-red-500 to-rose-600",
};

const stageBadge: Record<string, string> = {
  Initial: "bg-blue-50 text-blue-700 border-blue-200/60",
  Connected: "bg-amber-50 text-amber-700 border-amber-200/60",
  Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  Closed: "bg-red-50 text-red-700 border-red-200/60",
};

const channelBadge: Record<string, string> = {
  WhatsApp: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Instagram: "bg-pink-50 text-pink-700 border-pink-200",
  Facebook: "bg-blue-50 text-blue-700 border-blue-200",
  Ads: "bg-purple-50 text-purple-700 border-purple-200",
  Email: "bg-sky-50 text-sky-700 border-sky-200",
  "Referral/Others": "bg-amber-50 text-amber-700 border-amber-200",
  Referral: "bg-amber-50 text-amber-700 border-amber-200",
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  WhatsApp: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Instagram: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  Facebook: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  Ads: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  ),
  Email: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  "Referral/Others": (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Referral: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

const STAGE_DETAILS: Record<string, { label: string; desc: string; dot: string; bar: string; badge: string; icon: React.ReactNode }> = {
  Initial: {
    label: "Initial Inquiries",
    desc: "Fresh leads to contact",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
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
    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  Confirmed: {
    label: "Confirmed Deals",
    desc: "Booking finalized",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
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
  const initialLeads = leads.filter((l) => l.stage === "Initial").length;
  const connectedLeads = leads.filter((l) => l.stage === "Connected").length;
  const inProgressLeads = initialLeads + connectedLeads;
  const wonCount = leads.filter((l) => l.stage === "Confirmed").length;
  const conversionRate = leads.length > 0 ? ((wonCount / leads.length) * 100).toFixed(1) : "0.0";
  const totalPipelineValue = leads.reduce((s, l) => s + (l.value || 0), 0);
  const firstName = user.name.split(" ")[0];

  const todayTasks = tasks.filter((t) => !t.done && isToday(t.dueDate));
  const overdueTasks = tasks.filter((t) => !t.done && isOverdue(t.dueDate));
  const urgentTasks = [...overdueTasks, ...todayTasks].slice(0, 5);
  const tasksDoneCount = tasks.filter((t) => t.done).length;
  const pendingTasksCount = todayTasks.length + overdueTasks.length;
  const unreadCount = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  const initialPct = inProgressLeads > 0 ? Math.round((initialLeads / inProgressLeads) * 100) : 0;
  const connectedPct = inProgressLeads > 0 ? 100 - initialPct : 0;
  const winPct = leads.length > 0 ? Math.min(100, Math.round((wonCount / leads.length) * 100)) : 0;

  const STATS = [
    {
      id: "leads",
      label: "Assigned Portfolio",
      value: String(leads.length),
      unit: "leads",
      isUnitBadge: false,
      badge: (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-blue-700 border border-blue-200/70 shadow-2xs backdrop-blur-xs whitespace-nowrap shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-600 shrink-0"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          +{newLeadsCount} this week
        </span>
      ),
      ambientGlow: "from-blue-500/20 to-indigo-500/5",
      iconStyle: "bg-blue-50 text-blue-600 border border-blue-200/70 shadow-2xs",
      borderHover: "hover:border-blue-300/80",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 1 0 7.75" />
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
            <span className="text-zinc-500 font-medium truncate">New in 7 days</span>
            <span className="font-bold text-blue-700 flex items-center gap-1 shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              {newLeadsCount} added
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/40 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${leads.length > 0 ? Math.min(100, Math.round((newLeadsCount / leads.length) * 100) * 2) : 0}%` }} />
          </div>
        </div>
      ),
    },
    {
      id: "pipeline",
      label: "Active in Pipeline",
      value: String(inProgressLeads),
      unit: "in progress",
      isUnitBadge: false,
      badge: (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-amber-700 border border-amber-200/70 shadow-2xs backdrop-blur-xs whitespace-nowrap shrink-0">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
          </span>
          Discussion
        </span>
      ),
      ambientGlow: "from-amber-500/20 to-orange-500/5",
      iconStyle: "bg-amber-50 text-amber-600 border border-amber-200/70 shadow-2xs",
      borderHover: "hover:border-amber-300/80",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
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
              <strong className="font-bold text-zinc-800 shrink-0">{initialLeads}</strong> <span className="truncate">Initial</span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-100" />
              <strong className="font-bold text-zinc-800 shrink-0">{connectedLeads}</strong> <span className="truncate">Connected</span>
            </span>
          </div>
          <div className="flex h-2 w-full gap-1 rounded-full bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/40 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${initialPct}%` }} title={`Initial: ${initialLeads} (${initialPct}%)`} />
            <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${connectedPct}%` }} title={`Connected: ${connectedLeads} (${connectedPct}%)`} />
          </div>
        </div>
      ),
    },
    {
      id: "deals",
      label: "Completed Deals",
      value: String(wonCount),
      unit: `of ${leads.length} leads`,
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
            <span className="text-zinc-500 font-medium truncate">Win Conversion</span>
            <span className="font-bold text-emerald-700 shrink-0">{conversionRate}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/40 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${winPct}%` }} />
          </div>
        </div>
      ),
    },
    {
      id: "tasks",
      label: "Tasks & Follow-ups",
      value: String(pendingTasksCount),
      unit: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "pending",
      isUnitBadge: overdueTasks.length > 0,
      badge:
        overdueTasks.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-rose-700 border border-rose-200/70 shadow-2xs backdrop-blur-xs whitespace-nowrap shrink-0">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            Urgent
          </span>
        ) : unreadCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-amber-700 border border-amber-200/70 shadow-2xs backdrop-blur-xs whitespace-nowrap shrink-0">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            {unreadCount} unread
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-violet-700 border border-violet-200/70 shadow-2xs backdrop-blur-xs whitespace-nowrap shrink-0">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
            </span>
            All clear
          </span>
        ),
      ambientGlow: overdueTasks.length > 0 ? "from-rose-500/20 to-red-500/5" : "from-violet-500/20 to-purple-500/5",
      iconStyle: overdueTasks.length > 0 ? "bg-rose-50 text-rose-600 border border-rose-200/70 shadow-2xs" : "bg-violet-50 text-violet-600 border border-violet-200/70 shadow-2xs",
      borderHover: overdueTasks.length > 0 ? "hover:border-rose-300/80" : "hover:border-violet-300/80",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      sparkline: (
        <svg width="40" height="20" viewBox="0 0 44 22" fill="none" className="shrink-0 text-violet-500/35 group-hover:text-violet-500/60 transition-colors">
          <path d="M4 14 L18 14 L24 6 L32 20 L38 12 L44 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      footer: (
        <div className="space-y-2 pt-3 mt-1 border-t border-zinc-100/90">
          <div className="flex items-center justify-between text-[11px] sm:text-xs gap-1 min-w-0">
            <span className="text-zinc-500 font-medium truncate">
              {todayTasks.length > 0 ? `${todayTasks.length} due today` : "Schedule status"}
            </span>
            <span className={`font-bold flex items-center gap-1.5 shrink-0 ${overdueTasks.length > 0 ? "text-rose-600" : "text-violet-700"}`}>
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${overdueTasks.length > 0 ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
              {overdueTasks.length > 0 ? "Action needed" : "Up to date"}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/40 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${overdueTasks.length > 0 ? "bg-rose-500" : "bg-gradient-to-r from-violet-500 to-purple-500"}`} style={{ width: "100%" }} />
          </div>
        </div>
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
    { channel: "Facebook", count: leads.filter((l) => l.channel === "Facebook").length, color: "bg-blue-500" },
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
              Welcome back to your FX-CRM overview. You have <span className="text-emerald-700 font-bold">{leads.length} assigned leads</span> in your pipeline
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

      {/* ── Stat Cards Grid (Modern High-End SaaS Metric Cards) ───────────── */}
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

      {/* ── Main Performance & Overview Section ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Pipeline Breakdown - 2/3 */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs lg:col-span-2 flex flex-col justify-between space-y-5">
          <div>
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  </span>
                  Leads Pipeline Funnel
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">{leads.length} total active opportunities · {wonCount} deals won ({conversionRate}%)</p>
              </div>
              <a
                href="/dashboard/leads"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors shadow-2xs"
              >
                Open Board
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>

            {/* Segmented Visual Pipeline Flow Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                <span>Pipeline Stage Distribution</span>
                <span>{leads.length} Total Leads</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 p-0.5 ring-1 ring-zinc-200/50">
                {STAGES.map((stg) => {
                  const count = leads.filter((l) => l.stage === stg).length;
                  const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
                  const detail = STAGE_DETAILS[stg] ?? STAGE_DETAILS.Initial;
                  if (count === 0) return null;
                  return (
                    <div
                      key={stg}
                      className={`h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 ${detail.bar}`}
                      style={{ width: `${pct}%` }}
                      title={`${detail.label}: ${count} (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* 4 Stage Metric Cards in a Responsive 2x2 Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STAGES.map((stg) => {
                const count = leads.filter((l) => l.stage === stg).length;
                const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                const detail = STAGE_DETAILS[stg] ?? STAGE_DETAILS.Initial;

                return (
                  <div
                    key={stg}
                    className="group relative rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3.5 hover:bg-white hover:border-zinc-300 hover:shadow-xs transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border shrink-0 ${detail.badge}`}>
                          {detail.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">{detail.label}</p>
                          <p className="text-[10.5px] text-zinc-400 truncate">{detail.desc}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-bold border ${detail.badge}`}>
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
                        className={`h-full rounded-full transition-all duration-500 ${detail.bar}`}
                        style={{ width: `${Math.max(count > 0 ? 6 : 0, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Acquisition Channel Mix (Bottom Pills) */}
          <div className="pt-3 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Acquisition Channel Mix</p>
              <a href="/dashboard/stats" className="text-[11px] font-bold text-emerald-700 hover:underline">
                Channel Analytics →
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {channelCounts.map((item) => {
                const badge = channelBadge[item.channel] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
                const icon = CHANNEL_ICONS[item.channel] ?? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                );

                return (
                  <div
                    key={item.channel}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:scale-[1.02] ${badge}`}
                  >
                    <span className="shrink-0 opacity-80">{icon}</span>
                    <span>{item.channel}</span>
                    <span className="ml-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10.5px] font-black tabular-nums shadow-2xs">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Daily Focus & Productivity Hub - 1/3 */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </span>
                <h2 className="text-base font-bold text-zinc-900">Daily Focus</h2>
                {overdueTasks.length > 0 ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600 border border-red-200">
                    {overdueTasks.length} Late
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                    On Track
                  </span>
                )}
              </div>
              <a href="/dashboard/tasks" className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
                All Tasks →
              </a>
            </div>

            {/* Task list or Active Hub */}
            {urgentTasks.length === 0 ? (
              <div className="mt-3.5 space-y-3.5">
                {/* Clean Status Banner */}
                <div className="rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900">Schedule All Clear!</p>
                    <p className="text-[11px] text-zinc-500 font-medium">No pending or overdue reminders for today.</p>
                  </div>
                </div>

                {/* Quick Productivity Shortcuts */}
                <div className="space-y-1.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="/dashboard/leads"
                      className="group flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-2.5 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all"
                    >
                      <div className="flex items-center justify-between text-zinc-600 group-hover:text-emerald-700">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-zinc-800 group-hover:text-emerald-900">Add Lead</p>
                    </a>

                    <a
                      href="/dashboard/chats"
                      className="group flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-2.5 hover:bg-blue-50/50 hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-center justify-between text-zinc-600 group-hover:text-blue-700">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {unreadCount > 0 ? (
                          <span className="rounded-full bg-blue-600 px-1.5 py-0.2 text-[9px] font-black text-white">{unreadCount}</span>
                        ) : (
                          <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-bold text-zinc-800 group-hover:text-blue-900">Open Chats</p>
                    </a>

                    <a
                      href="/dashboard/tasks"
                      className="group flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-2.5 hover:bg-amber-50/50 hover:border-amber-200 transition-all"
                    >
                      <div className="flex items-center justify-between text-zinc-600 group-hover:text-amber-700">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-zinc-800 group-hover:text-amber-900">Task List</p>
                    </a>

                    <a
                      href="/dashboard/stats"
                      className="group flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-2.5 hover:bg-violet-50/50 hover:border-violet-200 transition-all"
                    >
                      <div className="flex items-center justify-between text-zinc-600 group-hover:text-violet-700">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                        <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-zinc-800 group-hover:text-violet-900">My Reports</p>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {urgentTasks.map((task) => {
                  const overdue = isOverdue(task.dueDate);
                  const ts = TASK_STYLE[task.type] ?? TASK_STYLE.message;
                  const paths = TASK_ICON_PATHS[task.type] ?? TASK_ICON_PATHS.message;
                  return (
                    <li
                      key={task.id}
                      className={`rounded-xl p-2.5 transition-colors border ${
                        overdue
                          ? "bg-red-50/60 border-red-200/80"
                          : "bg-zinc-50/60 border-zinc-200/60 hover:bg-zinc-100/60"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-lg ${
                            overdue ? "bg-red-100 text-red-600" : `${ts.bg} ${ts.icon}`
                          }`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            {paths.map((d, i) => <path key={i} d={d} strokeLinecap="round" strokeLinejoin="round" />)}
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-zinc-900">{task.title}</p>
                          <p className="truncate text-[11px] text-zinc-500 font-medium">{task.contact}</p>
                        </div>
                        {overdue && (
                          <span className="flex-none rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600">
                            Late
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Today's Pipeline Pulse Footer */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
              <span>Overall Task Completion</span>
              <span className="font-extrabold text-zinc-800">
                {tasks.length > 0 ? Math.round((tasksDoneCount / tasks.length) * 100) : 100}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-200/70 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${tasks.length > 0 ? (tasksDoneCount / tasks.length) * 100 : 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10.5px] text-zinc-400 pt-0.5">
              <span>{tasksDoneCount} of {tasks.length} finished</span>
              <span className="font-bold text-emerald-700">+{newLeadsCount} new leads</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modern High-End Activity Stream Data Table ─────────────────────── */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50/30">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </span>
              Recent CRM Activity Stream
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Latest {recentLeads.length} client interactions and incoming opportunities</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600 border border-zinc-200/70">
              {leads.length} Total Leads
            </span>
            <a
              href="/dashboard/leads"
              className="inline-flex items-center gap-1 rounded-xl bg-white border border-zinc-200/90 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-2xs transition-colors"
            >
              View Full Pipeline
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/90 border-b border-zinc-200 text-zinc-500 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Client &amp; Trip</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Pipeline Stage</th>
                <th className="px-5 py-3">Deal Value</th>
                <th className="px-5 py-3">Logged</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentLeads.map((lead) => {
                const badgeClass = channelBadge[lead.channel] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
                const stageInfo = STAGE_DETAILS[lead.stage] ?? STAGE_DETAILS.Initial;
                const channelIcon = CHANNEL_ICONS[lead.channel] ?? null;

                return (
                  <tr key={lead.id} className="group hover:bg-zinc-50/70 transition-colors">
                    {/* Client Name & Company */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8.5 w-8.5 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${grad(lead.name)} text-xs font-black text-white shadow-2xs`}>
                          {initials(lead.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 text-sm truncate group-hover:text-emerald-700 transition-colors">
                            {lead.name}
                          </p>
                          <p className="text-[11px] font-medium text-zinc-400 truncate">
                            {lead.companyName || "Personal Enquiry"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact Phone */}
                    <td className="px-5 py-3.5 font-medium text-zinc-600">
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="inline-flex items-center gap-1.5 hover:text-emerald-700 hover:underline"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-zinc-400 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.57 11 19.79 19.79 0 0 1 1.5 2.18 2 2 0 0 1 3.5 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.91 6.91l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          <span className="font-semibold text-zinc-700">{lead.phone}</span>
                        </a>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>

                    {/* Channel */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${badgeClass}`}>
                        {channelIcon && <span className="shrink-0 opacity-80">{channelIcon}</span>}
                        {lead.channel}
                      </span>
                    </td>

                    {/* Stage */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${stageInfo.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${stageInfo.dot}`} />
                        {lead.stage}
                      </span>
                    </td>

                    {/* Deal Value */}
                    <td className="px-5 py-3.5 font-black text-emerald-700 text-xs tabular-nums">
                      {lead.value ? formatValue(lead.value) : <span className="font-normal text-zinc-300">—</span>}
                    </td>

                    {/* Added Time */}
                    <td className="px-5 py-3.5 font-medium text-zinc-400 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300 shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {formatRelativeTime(lead.createdAt)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5 text-right">
                      <a
                        href="/dashboard/leads"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-colors shadow-2xs"
                      >
                        Open
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </a>
                    </td>
                  </tr>
                );
              })}

              {recentLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-xs text-zinc-400 italic">
                    No recent CRM activity recorded yet.
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
