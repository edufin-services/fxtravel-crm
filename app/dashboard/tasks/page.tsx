"use client";

import { useEffect, useMemo, useState } from "react";

type TaskType = "call" | "email" | "meeting" | "message";
type Filter = "all" | "overdue" | "today" | "upcoming" | "done";

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

type Lead = { id: string; name: string };

// ── Styling maps ────────────────────────────────────────────────────────────

const TYPE_STYLE: Record<TaskType, { badge: string; icon: string; border: string }> = {
  call: {
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    icon: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
    border: "border-l-emerald-400",
  },
  email: {
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
    border: "border-l-blue-400",
  },
  meeting: {
    badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 8 4 4 0 000-8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    border: "border-l-violet-400",
  },
  message: {
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    border: "border-l-amber-400",
  },
};

function TypeIcon({ type, size = 14 }: { type: TaskType; size?: number }) {
  const paths = TYPE_STYLE[type].icon.split(" M ").map((p, i) => (i === 0 ? p : "M " + p));
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function classifyTask(task: Task): "overdue" | "today" | "upcoming" | "done" {
  if (task.done) return "done";
  const due = startOfDay(new Date(task.dueDate));
  const today = startOfDay(new Date());
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

function formatDue(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const sd = startOfDay(d);
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  if (sd === startOfDay(today)) return `Today, ${time}`;
  if (sd === startOfDay(yesterday)) return `Yesterday, ${time}`;
  if (sd === startOfDay(tomorrow)) return `Tomorrow, ${time}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ", " + time;
}

function isoToDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [typeFilter, setTypeFilter] = useState<TaskType | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Stats
  const counts = useMemo(() => {
    const c = { overdue: 0, today: 0, upcoming: 0, done: 0 };
    for (const t of tasks) c[classifyTask(t)]++;
    return c;
  }, [tasks]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        const cat = classifyTask(t);
        const matchFilter = filter === "all" ? true : cat === filter;
        const matchType = typeFilter === "all" || t.type === typeFilter;
        return matchFilter && matchType;
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, filter, typeFilter]);

  async function handleToggleDone(task: Task) {
    const updated = { ...task, done: !task.done };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: updated.done }),
    });
  }

  async function handleCreate(data: Omit<Task, "id" | "done">) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok) {
      setTasks((prev) => [...prev, body.task]);
      setShowModal(false);
    }
    return body;
  }

  async function handleEdit(id: string, data: Omit<Task, "id" | "done">) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === id ? body.task : t)));
      setEditTask(null);
    }
    return body;
  }

  async function handleDelete() {
    if (!deleteId) return;
    setTasks((prev) => prev.filter((t) => t.id !== deleteId));
    await fetch(`/api/tasks/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
  }

  const FILTERS: { key: Filter; label: string; count?: number; color?: string }[] = [
    { key: "all", label: "All", count: tasks.length },
    { key: "overdue", label: "Overdue", count: counts.overdue, color: counts.overdue > 0 ? "text-red-600" : undefined },
    { key: "today", label: "Today", count: counts.today, color: counts.today > 0 ? "text-amber-600" : undefined },
    { key: "upcoming", label: "Upcoming", count: counts.upcoming },
    { key: "done", label: "Done", count: counts.done },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Tasks</h1>
          <p className="mt-0.5 text-sm text-zinc-400">{tasks.length} total task{tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setEditTask(null); setShowModal(true); }}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
          Add task
        </button>
      </div>

      {/* Stats strip */}
      {!loading && tasks.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Overdue", value: counts.overdue, bg: counts.overdue > 0 ? "bg-red-500" : "bg-zinc-300", text: "text-white" },
            { label: "Due Today", value: counts.today, bg: counts.today > 0 ? "bg-amber-500" : "bg-zinc-300", text: "text-white" },
            { label: "Upcoming", value: counts.upcoming, bg: "bg-blue-500", text: "text-white" },
            { label: "Completed", value: counts.done, bg: "bg-emerald-500", text: "text-white" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-sm">
              <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${s.bg}`}>
                <span className={`text-sm font-bold ${s.text}`}>{s.value}</span>
              </div>
              <span className="text-sm font-medium text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.key ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {f.label}
              {f.count !== undefined && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  filter === f.key ? "bg-white/20 text-white" : (f.color ?? "bg-zinc-100 text-zinc-500")
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5">
          {(["all", "call", "email", "meeting", "message"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                typeFilter === t
                  ? "bg-zinc-900 text-white"
                  : "bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
              }`}
            >
              {t === "all" ? "All types" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white px-5 py-4 shadow-sm">
              <div className="h-5 w-5 rounded-full bg-zinc-200 flex-none" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-48 rounded bg-zinc-200" />
                <div className="h-2.5 w-32 rounded bg-zinc-100" />
              </div>
              <div className="h-5 w-16 rounded-full bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-zinc-700">
            {filter !== "all" || typeFilter !== "all" ? "No matching tasks" : "No tasks yet"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {filter !== "all" || typeFilter !== "all"
              ? "Try changing the filter"
              : "Add your first task to get started"}
          </p>
          {(filter !== "all" || typeFilter !== "all") ? (
            <button
              onClick={() => { setFilter("all"); setTypeFilter("all"); }}
              className="mt-4 rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm transition-colors"
            >
              + Add task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const cat = classifyTask(task);
            const s = TYPE_STYLE[task.type];
            return (
              <div
                key={task.id}
                className={`group flex items-start gap-4 rounded-2xl border bg-white px-5 py-4 shadow-sm transition-colors hover:shadow-md border-l-4 ${s.border} ${
                  task.done ? "opacity-60" : ""
                } ${cat === "overdue" && !task.done ? "border-t-red-100 bg-red-50/30" : "border-zinc-200"}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleDone(task)}
                  className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition-colors ${
                    task.done
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-zinc-300 hover:border-brand-400"
                  }`}
                  title={task.done ? "Mark incomplete" : "Mark complete"}
                >
                  {task.done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-semibold text-zinc-900 leading-tight ${task.done ? "line-through text-zinc-400" : ""}`}>
                      {task.title}
                    </p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.badge}`}>
                      <TypeIcon type={task.type} size={10} />
                      {task.type}
                    </span>
                    {cat === "overdue" && !task.done && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">Late</span>
                    )}
                    {cat === "today" && !task.done && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Today</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                      {task.contact}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                      </svg>
                      {formatDue(task.dueDate)}
                    </span>
                    {task.leadName && (
                      <span className="flex items-center gap-1 text-brand-600">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                        {task.leadName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-none">
                  <button
                    onClick={() => setEditTask(task)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
                    title="Edit"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteId(task.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:border-red-200 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add task modal */}
      {(showModal || editTask) && (
        <TaskModal
          task={editTask}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSubmit={editTask
            ? (data) => handleEdit(editTask.id, data)
            : handleCreate
          }
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-zinc-900">Delete task?</h2>
            <p className="mt-1.5 text-sm text-zinc-500">This task will be permanently removed.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Task Modal ───────────────────────────────────────────────────────────────

function TaskModal({
  task,
  onClose,
  onSubmit,
}: {
  task: Task | null;
  onClose: () => void;
  onSubmit: (data: Omit<Task, "id" | "done">) => Promise<{ error?: string }>;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [contact, setContact] = useState(task?.contact ?? "");
  const [type, setType] = useState<TaskType>(task?.type ?? "call");
  const [dueDate, setDueDate] = useState(task ? isoToDatetimeLocal(task.dueDate) : "");
  const [leadSearch, setLeadSearch] = useState(task?.leadName ?? "");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadId, setLeadId] = useState(task?.leadId ?? "");
  const [leadName, setLeadName] = useState(task?.leadName ?? "");
  const [showLeads, setShowLeads] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = leadSearch.trim();
    if (!q || leadId) { setLeads([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/leads?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setLeads((d.leads ?? []).slice(0, 6)));
    }, 250);
    return () => clearTimeout(t);
  }, [leadSearch, leadId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dueDate) { setError("Please set a due date."); return; }
    setError("");
    setSaving(true);
    const result = await onSubmit({ title, contact, type, dueDate: new Date(dueDate).toISOString(), leadId: leadId || undefined, leadName: leadName || undefined });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  const inputCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors";
  const labelCls = "mb-1.5 block text-xs font-semibold text-zinc-500 uppercase tracking-wide";

  const TYPES: TaskType[] = ["call", "email", "meeting", "message"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">{task ? "Edit task" : "New task"}</h2>
            <p className="text-xs text-zinc-400">{task ? "Update task details" : "Fill in the details below"}</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

          <div>
            <label className={labelCls}>Title *</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Follow up on proposal" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Contact *</label>
            <input required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact name" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition-colors capitalize ${
                    type === t
                      ? `${TYPE_STYLE[t].badge} border-transparent`
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                  }`}
                >
                  <TypeIcon type={t} size={14} />
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Due date & time *</label>
            <input required type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </div>

          <div className="relative">
            <label className={labelCls}>Linked lead (optional)</label>
            {leadId ? (
              <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5">
                <span className="text-sm font-medium text-brand-700">{leadName}</span>
                <button
                  type="button"
                  onClick={() => { setLeadId(""); setLeadName(""); setLeadSearch(""); }}
                  className="text-brand-400 hover:text-brand-600"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                </button>
              </div>
            ) : (
              <>
                <input
                  value={leadSearch}
                  onChange={(e) => { setLeadSearch(e.target.value); setShowLeads(true); }}
                  onFocus={() => setShowLeads(true)}
                  placeholder="Search leads..."
                  className={inputCls}
                />
                {showLeads && leads.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
                    {leads.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => { setLeadId(l.id); setLeadName(l.name); setLeadSearch(l.name); setShowLeads(false); setLeads([]); }}
                        className="w-full px-3.5 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm transition-colors">
              {saving ? "Saving..." : task ? "Save changes" : "Add task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
