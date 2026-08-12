"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PhoneIcon, MailIcon, CalendarIcon, ChatIcon } from "../icons";

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

const typeIcon: Record<string, React.ReactNode> = {
  call: <PhoneIcon />,
  email: <MailIcon />,
  meeting: <CalendarIcon />,
  message: <ChatIcon />,
};

const typeStyle: Record<string, string> = {
  call: "bg-blue-50 text-blue-700 border-blue-200/80",
  email: "bg-amber-50 text-amber-700 border-amber-200/80",
  meeting: "bg-purple-50 text-purple-700 border-purple-200/80",
  message: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
};

const typeDot: Record<string, string> = {
  call: "bg-blue-500",
  email: "bg-amber-500",
  meeting: "bg-purple-500",
  message: "bg-emerald-500",
};

const typeLabel: Record<string, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  message: "Message",
};

const typeCellStyle: Record<string, string> = {
  call: "bg-blue-50 text-blue-700 border border-blue-200/60",
  email: "bg-amber-50 text-amber-700 border border-amber-200/60",
  meeting: "bg-purple-50 text-purple-700 border border-purple-200/60",
  message: "bg-emerald-50 text-emerald-800 border border-emerald-200/60",
};

const typeBorderL: Record<string, string> = {
  call: "border-l-blue-500",
  email: "border-l-amber-500",
  meeting: "border-l-purple-500",
  message: "border-l-emerald-500",
};

const TASK_TYPES: TaskType[] = ["call", "email", "meeting", "message"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

function isoToDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type SubmitData = { title: string; contact: string; type: TaskType; dueDate: string; leadId?: string; leadName?: string };

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dueAlerts, setDueAlerts] = useState<Task[]>([]);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const pageLoadedAt = useRef(Date.now());
  const notifiedIds = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;

    function checkAndSchedule() {
      const now = Date.now();
      const newAlerts: Task[] = [];
      for (const task of tasks) {
        if (task.done || notifiedIds.current.has(task.id)) continue;
        const due = new Date(task.dueDate).getTime();
        if (due >= pageLoadedAt.current && due <= now) {
          notifiedIds.current.add(task.id);
          newAlerts.push(task);
        }
      }
      if (newAlerts.length > 0) {
        setDueAlerts((prev) => [...prev, ...newAlerts]);
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      const nextDue = tasks
        .filter((t) => !t.done && !notifiedIds.current.has(t.id))
        .map((t) => new Date(t.dueDate).getTime())
        .filter((due) => due > now && due >= pageLoadedAt.current)
        .sort((a, b) => a - b)[0];

      if (nextDue !== undefined) {
        timerRef.current = setTimeout(checkAndSchedule, Math.max(0, nextDue - Date.now() + 200));
      }
    }

    checkAndSchedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [loading, tasks]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const key = dateKey(new Date(task.dueDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(start.getDate() - start.getDay());
    const result: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      result.push(d);
    }
    return result;
  }, [cursor]);

  const calendarStats = useMemo(() => {
    const now = new Date();
    const todayStr = dateKey(now);
    const monthCount = tasks.filter((t) => {
      const d = new Date(t.dueDate);
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
    }).length;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    const weekCount = tasks.filter((t) => {
      const d = new Date(t.dueDate).getTime();
      return d >= startOfWeek.getTime() && d <= endOfWeek.getTime();
    }).length;
    const todayCount = tasks.filter((t) => dateKey(new Date(t.dueDate)) === todayStr).length;
    const overdueCount = tasks.filter((t) => {
      if (t.done) return false;
      const d = new Date(t.dueDate);
      d.setHours(23, 59, 59, 999);
      return d < now && dateKey(new Date(t.dueDate)) !== todayStr;
    }).length;
    return { month: monthCount, week: weekCount, today: todayCount, overdue: overdueCount };
  }, [tasks, cursor]);

  const selectedTasks = tasksByDay.get(dateKey(selectedDate)) ?? [];
  const today = new Date();
  const isSelectedToday = dateKey(selectedDate) === dateKey(today);

  async function handleToggle(id: string, done: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
  }

  async function handleDelete(id: string) {
    setDeleteId(id);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setTasks((prev) => prev.filter((t) => t.id !== deleteId));
    await fetch(`/api/tasks/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
  }

  async function handleEdit(id: string, data: SubmitData) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...body.task } : t)));
      setEditTask(null);
      notifiedIds.current.delete(id);
    }
    return body;
  }

  async function handleAdd(data: SubmitData) {
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

  return (
    <div className="space-y-6 pb-8">
      {/* ── Page Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Schedule &amp; Calendar</h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-200">
              Active Scheduler
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            {tasks.filter((t) => !t.done).length} pending tasks · {tasks.length} total events scheduled
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
          New Task Schedule
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="animate-pulse rounded-3xl border border-zinc-200 bg-white p-6 lg:col-span-2">
            <div className="mb-4 flex justify-between">
              <div className="h-5 w-32 rounded bg-zinc-200" />
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-xl bg-zinc-200" />
                <div className="h-8 w-16 rounded-xl bg-zinc-200" />
                <div className="h-8 w-8 rounded-xl bg-zinc-200" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(42)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-zinc-100" />
              ))}
            </div>
          </div>
          <div className="animate-pulse rounded-3xl border border-zinc-200 bg-white p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="h-10 w-1 rounded bg-zinc-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-zinc-200" />
                  <div className="h-2.5 w-20 rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── Stat Pills ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
              <span className="flex h-3 w-3 rounded-full bg-zinc-400" />
              <div>
                <p className="text-xl font-black text-zinc-900">{calendarStats.month}</p>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">This Month</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 shadow-2xs">
              <span className="flex h-3 w-3 rounded-full bg-indigo-500" />
              <div>
                <p className="text-xl font-black text-indigo-900">{calendarStats.week}</p>
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">This Week</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-2xs">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xl font-black text-emerald-900">{calendarStats.today}</p>
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Due Today</p>
              </div>
            </div>

            <div className={`flex items-center gap-3.5 rounded-2xl border p-4 shadow-2xs ${
              calendarStats.overdue > 0 ? "border-rose-200 bg-rose-50/60" : "border-zinc-200/90 bg-white"
            }`}>
              <span className={`flex h-3 w-3 rounded-full ${calendarStats.overdue > 0 ? "bg-rose-500 animate-pulse" : "bg-zinc-300"}`} />
              <div>
                <p className={`text-xl font-black ${calendarStats.overdue > 0 ? "text-rose-700" : "text-zinc-900"}`}>{calendarStats.overdue}</p>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${calendarStats.overdue > 0 ? "text-rose-700" : "text-zinc-400"}`}>Overdue</p>
              </div>
            </div>
          </div>

          {/* ── Calendar & Day Schedule Grid ─────────────────────────── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Calendar grid */}
            <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-2xs lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <h2 className="text-base font-black text-zinc-900">
                  {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                    aria-label="Previous month"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                      setSelectedDate(now);
                    }}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                    aria-label="Next month"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>

              {/* 7 Day Grid */}
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-100 text-xs">
                {WEEKDAYS.map((day, i) => (
                  <div
                    key={day}
                    className={`px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wider ${
                      i === 0 || i === 6 ? "bg-zinc-100/70 text-zinc-400" : "bg-zinc-50 text-zinc-500"
                    }`}
                  >
                    {day}
                  </div>
                ))}

                {days.map((day) => {
                  const inMonth = day.getMonth() === cursor.getMonth();
                  const isToday = dateKey(day) === dateKey(today);
                  const isSelected = dateKey(day) === dateKey(selectedDate);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const dayTasks = tasksByDay.get(dateKey(day)) ?? [];

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={[
                        "flex min-h-[84px] flex-col items-start gap-1 p-1.5 text-left transition-colors cursor-pointer",
                        isWeekend && inMonth ? "bg-zinc-50/70" : "bg-white",
                        !inMonth ? "bg-white opacity-30" : "",
                        isSelected ? "ring-2 ring-inset ring-emerald-500 bg-emerald-50/20" : "hover:bg-emerald-50/30",
                      ].join(" ")}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black transition-colors ${
                          isToday
                            ? "bg-emerald-600 text-white shadow-xs"
                            : isSelected
                            ? "text-emerald-700 font-black"
                            : "text-zinc-700"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      <div className="flex flex-col gap-0.5 w-full">
                        {dayTasks.slice(0, 2).map((t) => (
                          <span
                            key={t.id}
                            className={`w-full rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-tight truncate ${typeCellStyle[t.type]} ${t.done ? "opacity-40 line-through" : ""}`}
                          >
                            {t.title}
                          </span>
                        ))}
                        {dayTasks.length > 2 && (
                          <span className="px-1 text-[9px] font-extrabold text-zinc-400">+{dayTasks.length - 2} more</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Day Schedule Panel */}
            <div className="flex flex-col rounded-3xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden">
              <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4 bg-zinc-50/40">
                <div
                  className={`flex h-11 w-11 flex-none items-center justify-center rounded-2xl text-base font-black shadow-xs ${
                    isSelectedToday ? "bg-emerald-600 text-white" : "bg-zinc-900 text-white"
                  }`}
                >
                  {selectedDate.getDate()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-zinc-900 leading-tight">
                    {selectedDate.toLocaleDateString(undefined, { weekday: "long" })}
                  </p>
                  <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                    {selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
                    title="Add task"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Task summary */}
              {selectedTasks.length > 0 && (
                <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-2.5 bg-white">
                  {TASK_TYPES.map((t) => {
                    const count = selectedTasks.filter((s) => s.type === t).length;
                    if (count === 0) return null;
                    return (
                      <div key={t} className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${typeDot[t]}`} />
                        <span className="text-[11px] font-bold text-zinc-600">{count} {typeLabel[t].toLowerCase()}{count > 1 ? "s" : ""}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedTasks.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center px-4">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-zinc-800">No events scheduled</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">This date is completely clear.</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-4 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                    Add Task Schedule
                  </button>
                </div>
              ) : (
                <ul className="flex-1 overflow-y-auto divide-y divide-zinc-100">
                  {selectedTasks.map((task) => (
                    <li
                      key={task.id}
                      className={`group flex items-start gap-3 border-l-4 px-4 py-3.5 transition-colors hover:bg-zinc-50 ${typeBorderL[task.type]}`}
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={(e) => handleToggle(task.id, e.target.checked)}
                        className="mt-0.5 h-4 w-4 flex-none rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-xl mt-0.5 flex-shrink-0 text-xs">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${typeStyle[task.type]}`}>
                          {typeIcon[task.type]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold leading-tight ${task.done ? "text-zinc-400 line-through" : "text-zinc-900"}`}>
                          {task.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-500 truncate font-medium">
                          {task.leadName && (
                            <span className="font-bold text-emerald-700">{task.leadName} · </span>
                          )}
                          {task.contact}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-400">{formatTime(task.dueDate)}</span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold border ${typeStyle[task.type]}`}>
                            {typeLabel[task.type]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <button
                          onClick={() => setEditTask(task)}
                          className="flex-none text-zinc-400 hover:text-emerald-700 transition-colors cursor-pointer"
                          aria-label="Edit task"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="flex-none text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                          aria-label="Delete task"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {editTask && (
        <EventModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSubmit={(data: SubmitData) => handleEdit(editTask.id, data)}
        />
      )}

      {showModal && (
        <AddEventModal
          defaultDate={selectedDate}
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}

      {/* Due Alert Modal */}
      {dueAlerts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setDueAlerts([])}>
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 border-b border-zinc-100 px-6 py-5">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-800">
                  {dueAlerts.length === 1 ? "Task due now" : `${dueAlerts.length} tasks due now`}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400 font-medium">
                  {new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>

            <div className="divide-y divide-zinc-100 max-h-72 overflow-y-auto">
              {dueAlerts.map((task) => (
                <div key={task.id} className="flex items-center gap-4 px-6 py-4">
                  <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${typeStyle[task.type]}`}>
                    {typeIcon[task.type]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-900 leading-tight">{task.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-zinc-500 font-medium">{task.contact}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold border ${typeStyle[task.type]}`}>
                        {typeLabel[task.type]}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDueAlerts((prev) => prev.filter((a) => a.id !== task.id))}
                    className="flex-none text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-100 px-6 py-4 flex justify-end bg-zinc-50/50">
              <button
                onClick={() => setDueAlerts([])}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                Dismiss all
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="mt-3 text-base font-bold text-zinc-900">Delete task schedule?</h2>
            <p className="mt-1.5 text-xs text-zinc-400 font-medium">This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-2xs"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type LeadOption = { id: string; name: string; company: string };

function EventModal({
  task,
  onClose,
  onSubmit,
}: {
  task: Task;
  onClose: () => void;
  onSubmit: (data: SubmitData) => Promise<{ error?: string }>;
}) {
  const [title, setTitle] = useState(task.title);
  const [contact, setContact] = useState(task.contact);
  const [type, setType] = useState<TaskType>(task.type);
  const [dueDate, setDueDate] = useState(() => isoToDatetimeLocal(task.dueDate));
  const [linkedLead, setLinkedLead] = useState<LeadOption | null>(
    task.leadId ? { id: task.leadId, name: task.leadName ?? "", company: "" } : null
  );
  const [leadSearch, setLeadSearch] = useState(task.leadName ?? "");
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [showLeadDrop, setShowLeadDrop] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const leadSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!leadSearch.trim() || linkedLead) { setLeadOptions([]); return; }
    if (leadSearchTimer.current) clearTimeout(leadSearchTimer.current);
    leadSearchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/leads");
        const d = await res.json();
        const q = leadSearch.toLowerCase();
        const opts: LeadOption[] = (d.leads ?? [])
          .filter((l: LeadOption) => l.name.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q))
          .slice(0, 6);
        setLeadOptions(opts);
        setShowLeadDrop(opts.length > 0);
      } catch {}
    }, 250);
    return () => { if (leadSearchTimer.current) clearTimeout(leadSearchTimer.current); };
  }, [leadSearch, linkedLead]);

  function selectLead(lead: LeadOption) {
    setLinkedLead(lead);
    setLeadSearch(lead.name);
    setContact((prev) => prev || lead.name);
    setLeadOptions([]);
    setShowLeadDrop(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const result = await onSubmit({
      title, contact, type,
      dueDate: new Date(dueDate).toISOString(),
      leadId: linkedLead?.id,
      leadName: linkedLead?.name,
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  const inputCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Edit Task Schedule</h2>
            <p className="text-xs text-zinc-400 font-medium truncate max-w-xs">{task.title}</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="p-6">
          {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">Task Type</label>
              <div className="grid grid-cols-4 gap-2">
                {TASK_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-2.5 transition-all cursor-pointer ${
                      type === t ? `border-current ${typeStyle[t]}` : "border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="flex h-4 w-4 items-center justify-center">{typeIcon[t]}</span>
                    <span className="text-[10px] font-bold">{typeLabel[t]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                Link to Lead <span className="normal-case font-normal text-zinc-400">(optional)</span>
              </label>
              {linkedLead ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2">
                  <span className="flex-1 text-xs font-bold text-emerald-800">{linkedLead.name}</span>
                  <button type="button" onClick={() => { setLinkedLead(null); setLeadSearch(""); }} className="text-emerald-700 hover:text-emerald-900">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    onFocus={() => leadSearch && setShowLeadDrop(leadOptions.length > 0)}
                    placeholder="Search leads..."
                    className={inputCls}
                  />
                  {showLeadDrop && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                      {leadOptions.map((lead) => (
                        <button key={lead.id} type="button" onClick={() => selectLead(lead)} className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-zinc-50 cursor-pointer">
                          <span className="text-xs font-bold text-zinc-900">{lead.name}</span>
                          <span className="text-[11px] text-zinc-400">{lead.company}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">Title</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Follow-up call" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">Contact Name</label>
                <input required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact Person" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">Date &amp; Time</label>
                <input required type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 shadow-2xs transition-colors">
                {saving ? "Saving…" : "Save Task Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AddEventModal({
  defaultDate,
  onClose,
  onAdd,
  prefillLead,
}: {
  defaultDate: Date;
  onClose: () => void;
  onAdd: (data: SubmitData) => Promise<{ error?: string }>;
  prefillLead?: LeadOption;
}) {
  const [title, setTitle] = useState("");
  const [contact, setContact] = useState(prefillLead?.name ?? "");
  const [type, setType] = useState<TaskType>("call");
  const [dueDate, setDueDate] = useState(() => toDatetimeLocal(defaultDate));
  const [linkedLead, setLinkedLead] = useState<LeadOption | null>(prefillLead ?? null);
  const [leadSearch, setLeadSearch] = useState(prefillLead?.name ?? "");
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [showLeadDrop, setShowLeadDrop] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const leadSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!leadSearch.trim() || linkedLead) { setLeadOptions([]); return; }
    if (leadSearchTimer.current) clearTimeout(leadSearchTimer.current);
    leadSearchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/leads");
        const data = await res.json();
        const q = leadSearch.toLowerCase();
        const opts: LeadOption[] = (data.leads ?? [])
          .filter((l: LeadOption) => l.name.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q))
          .slice(0, 6);
        setLeadOptions(opts);
        setShowLeadDrop(opts.length > 0);
      } catch {}
    }, 250);
    return () => { if (leadSearchTimer.current) clearTimeout(leadSearchTimer.current); };
  }, [leadSearch, linkedLead]);

  function selectLead(lead: LeadOption) {
    setLinkedLead(lead);
    setLeadSearch(lead.name);
    setContact((prev) => prev || lead.name);
    setLeadOptions([]);
    setShowLeadDrop(false);
  }

  function clearLead() {
    setLinkedLead(null);
    setLeadSearch("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await onAdd({
      title, contact, type,
      dueDate: new Date(dueDate).toISOString(),
      leadId: linkedLead?.id,
      leadName: linkedLead?.name,
    });
    setLoading(false);
    if (result.error) setError(result.error);
  }

  const inputCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">New Task Schedule</h2>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              {defaultDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="p-6">
          {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">Task Type</label>
              <div className="grid grid-cols-4 gap-2">
                {TASK_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-2.5 transition-all cursor-pointer ${
                      type === t
                        ? `border-current ${typeStyle[t]}`
                        : "border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="flex h-4 w-4 items-center justify-center">{typeIcon[t]}</span>
                    <span className="text-[10px] font-bold">{typeLabel[t]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                Link to Lead <span className="normal-case font-normal text-zinc-400">(optional)</span>
              </label>
              {linkedLead ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2">
                  <span className="flex-1 text-xs font-bold text-emerald-800">{linkedLead.name}</span>
                  {!prefillLead && (
                    <button type="button" onClick={clearLead} className="text-emerald-700 hover:text-emerald-900">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    onFocus={() => leadSearch && setShowLeadDrop(leadOptions.length > 0)}
                    placeholder="Search leads..."
                    className={inputCls}
                  />
                  {showLeadDrop && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                      {leadOptions.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => selectLead(lead)}
                          className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-zinc-50 cursor-pointer"
                        >
                          <span className="text-xs font-bold text-zinc-900">{lead.name}</span>
                          <span className="text-[11px] text-zinc-400">{lead.company}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">Title</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Follow-up call about pricing" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">Contact Name</label>
                <input required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact Person" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">Date &amp; Time</label>
                <input required type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 shadow-2xs transition-colors"
              >
                {loading ? "Adding…" : "Add Task"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
