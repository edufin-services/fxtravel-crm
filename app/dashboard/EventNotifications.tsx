"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TaskType = "call" | "email" | "meeting" | "message";

type Task = {
  id: string;
  title: string;
  contact: string;
  type: TaskType;
  dueDate: string;
  done: boolean;
  leadId?: string;
  leadName?: string;
};

const TYPE_CONFIG: Record<TaskType, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  call: {
    label: "Call Reminder",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.41 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9A16 16 0 0 0 15 16.09l1.36-1.37a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    ),
  },
  email: {
    label: "Email Reminder",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
  },
  meeting: {
    label: "Meeting Starting",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  message: {
    label: "Message Reminder",
    color: "text-brand-600",
    bg: "bg-brand-50",
    border: "border-brand-200",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
};

const STORAGE_KEY = "crm_notified_tasks";
const NOTIFY_WINDOW_MS = 2 * 60 * 1000;

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

function persistNotified(ids: string[]) {
  try {
    const existing = getNotifiedSet();
    ids.forEach((id) => existing.add(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing].slice(-300)));
  } catch {}
}

export default function EventNotifications() {
  const [alerts, setAlerts] = useState<Task[]>([]);
  const [current, setCurrent] = useState(0); // index of shown alert
  const tasksRef = useRef<Task[]>([]);

  const checkDue = useCallback((tasks: Task[]) => {
    const notified = getNotifiedSet();
    const now = Date.now();
    const triggered = tasks.filter((t) => {
      if (t.done || notified.has(t.id)) return false;
      const due = new Date(t.dueDate).getTime();
      return due <= now && due >= now - NOTIFY_WINDOW_MS;
    });
    if (triggered.length > 0) {
      persistNotified(triggered.map((t) => t.id));
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        return [...prev, ...triggered.filter((t) => !existingIds.has(t.id))];
      });
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) return;
      const data = await res.json();
      const tasks: Task[] = data.tasks ?? [];
      tasksRef.current = tasks;
      checkDue(tasks);
    } catch {}
  }, [checkDue]);

  useEffect(() => {
    loadTasks();
    const tickInterval = setInterval(() => checkDue(tasksRef.current), 30_000);
    const reloadInterval = setInterval(loadTasks, 5 * 60_000);
    return () => { clearInterval(tickInterval); clearInterval(reloadInterval); };
  }, [loadTasks, checkDue]);

  // Keep current pointer in bounds when alerts change
  useEffect(() => {
    setCurrent((prev) => Math.min(prev, Math.max(0, alerts.length - 1)));
  }, [alerts.length]);

  function dismiss(id: string) {
    setAlerts((prev) => {
      const next = prev.filter((t) => t.id !== id);
      return next;
    });
  }

  async function markDone(id: string) {
    dismiss(id);
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
  }

  if (alerts.length === 0) return null;

  const task = alerts[current] ?? alerts[0];
  const cfg = TYPE_CONFIG[task.type];
  const dueTime = new Date(task.dueDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const dueDate = new Date(task.dueDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[199] bg-black/40 backdrop-blur-sm"
        style={{ animation: "fadeIn 0.2s ease-out" }}
        onClick={() => dismiss(task.id)}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">

          {/* Colored top band */}
          <div className={`${cfg.bg} ${cfg.border} border-b px-8 pt-8 pb-6 flex flex-col items-center text-center`}>
            {/* Pulsing ring */}
            <div className="relative flex items-center justify-center mb-4">
              <span className={`absolute h-20 w-20 rounded-full ${cfg.bg} opacity-60`} style={{ animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${cfg.bg} border ${cfg.border} shadow-sm ${cfg.color}`}>
                {cfg.icon}
              </div>
            </div>

            <span className={`text-xs font-bold uppercase tracking-widest ${cfg.color} mb-1`}>{cfg.label}</span>
            <h2 className="text-2xl font-bold text-zinc-900 leading-tight mt-1">{task.title}</h2>
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            {/* Lead / contact */}
            {(task.leadName || task.contact) && (
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-zinc-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  {task.leadName && (
                    <p className="text-sm font-bold text-zinc-900">{task.leadName}</p>
                  )}
                  {task.contact && task.contact !== task.leadName && (
                    <p className="text-xs text-zinc-400">{task.contact}</p>
                  )}
                </div>
              </div>
            )}

            {/* Time */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-zinc-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">{dueTime}</p>
                <p className="text-xs text-zinc-400">{dueDate}</p>
              </div>
            </div>

            {/* Pagination dots (if multiple alerts) */}
            {alerts.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mb-5">
                {alerts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-zinc-700" : "w-1.5 bg-zinc-300"}`}
                  />
                ))}
                <span className="ml-2 text-xs text-zinc-400">{current + 1} of {alerts.length}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => markDone(task.id)}
                className={`flex-1 rounded-2xl py-3 text-sm font-bold text-white transition-colors shadow-sm ${
                  cfg.color === "text-blue-600" ? "bg-blue-600 hover:bg-blue-700" :
                  cfg.color === "text-amber-600" ? "bg-amber-500 hover:bg-amber-600" :
                  cfg.color === "text-violet-600" ? "bg-violet-600 hover:bg-violet-700" :
                  "bg-brand-600 hover:bg-brand-700"
                }`}
              >
                Mark as done
              </button>
              <button
                onClick={() => dismiss(task.id)}
                className="flex-1 rounded-2xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn  { from { opacity: 0; transform: scale(0.9) } to { opacity: 1; transform: scale(1) } }
        @keyframes ping     { 75%, 100% { transform: scale(1.8); opacity: 0 } }
      `}</style>
    </>
  );
}
