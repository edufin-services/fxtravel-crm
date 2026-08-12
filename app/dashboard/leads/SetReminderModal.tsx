"use client";

import React, { useState, useEffect } from "react";

type TaskType = "call" | "email" | "meeting" | "message";

const TASK_ICONS: Record<TaskType, React.ReactNode> = {
  call: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round"/>
    </svg>
  ),
  meeting: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/>
    </svg>
  ),
  message: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round"/>
    </svg>
  ),
  email: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round"/>
      <polyline points="22,6 12,13 2,6" strokeLinecap="round"/>
    </svg>
  ),
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Build a date string (YYYY-MM-DD) from local timezone
function todayLocalStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tomorrowLocalStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextWeekLocalStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Build a local ISO datetime from a date string + hour + minute + ampm
function buildLocalDate(dateStr: string, hour: number, minute: number, ampm: "AM" | "PM"): Date {
  let h = hour % 12;
  if (ampm === "PM") h += 12;
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d, h, minute, 0, 0);
}

function formatPreview(dateStr: string, hour: number, minute: number, ampm: "AM" | "PM") {
  const dt = buildLocalDate(dateStr, hour, minute, ampm);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SetReminderModal({
  leadId,
  leadName,
  onClose,
  onSaved,
}: {
  leadId: string;
  leadName: string;
  onClose: () => void;
  onSaved: (reminderAt: string, reminderNote: string) => void;
}) {
  const [type, setType] = useState<TaskType>("call");
  const [note, setNote] = useState(`Follow up call with ${leadName}`);
  const [preset, setPreset] = useState<"15m" | "1h" | "tomorrow" | "custom">("tomorrow");

  // Separate date + time state
  const [dateStr, setDateStr] = useState(tomorrowLocalStr());
  const [hour, setHour] = useState(9); // 1–12
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Update date/time fields when preset changes
  useEffect(() => {
    const now = new Date();
    if (preset === "15m") {
      const target = new Date(now.getTime() + 15 * 60 * 1000);
      setDateStr(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
      const rawH = target.getHours();
      setHour(rawH % 12 === 0 ? 12 : rawH % 12);
      setMinute(target.getMinutes());
      setAmpm(rawH >= 12 ? "PM" : "AM");
    } else if (preset === "1h") {
      const target = new Date(now.getTime() + 60 * 60 * 1000);
      setDateStr(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
      const rawH = target.getHours();
      setHour(rawH % 12 === 0 ? 12 : rawH % 12);
      setMinute(target.getMinutes());
      setAmpm(rawH >= 12 ? "PM" : "AM");
    } else if (preset === "tomorrow") {
      setDateStr(tomorrowLocalStr());
      setHour(9);
      setMinute(0);
      setAmpm("AM");
    } else {
      // custom — keep current values, or reset to next hour
      const target = new Date(now.getTime() + 60 * 60 * 1000);
      setDateStr(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
      const rawH = target.getHours();
      setHour(rawH % 12 === 0 ? 12 : rawH % 12);
      setMinute(0);
      setAmpm(rawH >= 12 ? "PM" : "AM");
    }
  }, [preset]);

  function getTargetDate(): Date {
    return buildLocalDate(dateStr, hour, minute, ampm);
  }

  async function handleSave() {
    setError("");
    const targetDate = getTargetDate();
    if (isNaN(targetDate.getTime())) {
      setError("Invalid date or time selected.");
      return;
    }
    if (targetDate.getTime() <= Date.now()) {
      setError("Please select a future date & time for the reminder.");
      return;
    }

    setSaving(true);
    try {
      const isoDate = targetDate.toISOString();

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: note.trim() || `Reminder for ${leadName}`,
          contact: leadName,
          type,
          dueDate: isoDate,
          leadId,
          leadName,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save reminder.");
        setSaving(false);
        return;
      }

      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: note.trim(), reminderAt: isoDate }),
      });

      onSaved(isoDate, note.trim());
      onClose();
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const previewText = formatPreview(dateStr, hour, minute, ampm);
  const isFutureDate = !isNaN(getTargetDate().getTime()) && getTargetDate().getTime() > Date.now();

  const selectCls =
    "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-zinc-200/80 animate-scaleIn overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-600/30">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900 leading-tight">Set Reminder</h3>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">for {leadName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-none">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Quick Select</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { id: "15m", label: "15 min" },
                  { id: "1h", label: "1 hour" },
                  { id: "tomorrow", label: "Tomorrow" },
                  { id: "custom", label: "Custom" },
                ] as const).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreset(item.id)}
                    className={`rounded-xl py-2 px-2 text-xs font-bold transition-all border ${
                      preset === item.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateStr}
                  min={todayLocalStr()}
                  onChange={(e) => { setDateStr(e.target.value); setPreset("custom"); }}
                  className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-semibold text-zinc-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => { setDateStr(todayLocalStr()); setPreset("custom"); }}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => { setDateStr(tomorrowLocalStr()); setPreset("custom"); }}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  +1
                </button>
              </div>
            </div>

            {/* Time Picker */}
            <div>
              <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Time</label>
              <div className="flex gap-2 items-center">
                {/* Hour */}
                <select
                  value={hour}
                  onChange={(e) => { setHour(Number(e.target.value)); setPreset("custom"); }}
                  className={`flex-1 ${selectCls}`}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>{pad(h)}</option>
                  ))}
                </select>
                <span className="text-zinc-400 font-black text-lg select-none">:</span>
                {/* Minute */}
                <select
                  value={minute}
                  onChange={(e) => { setMinute(Number(e.target.value)); setPreset("custom"); }}
                  className={`flex-1 ${selectCls}`}
                >
                  {minutes.map((m) => (
                    <option key={m} value={m}>{pad(m)}</option>
                  ))}
                </select>
                {/* AM/PM */}
                <div className="flex rounded-xl border border-zinc-200 overflow-hidden">
                  {(["AM", "PM"] as const).map((ap) => (
                    <button
                      key={ap}
                      type="button"
                      onClick={() => { setAmpm(ap); setPreset("custom"); }}
                      className={`px-3 py-2 text-xs font-black transition-colors ${
                        ampm === ap
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {ap}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {previewText && (
                <div className={`mt-2 rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-2 ${
                  isFutureDate
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-none">
                    {isFutureDate
                      ? <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" strokeLinecap="round"/></>
                      : <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></>
                    }
                  </svg>
                  {isFutureDate ? `Reminder will fire at: ${previewText}` : "Selected time is in the past"}
                </div>
              )}
            </div>

            {/* Action Type */}
            <div>
              <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Action Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["call", "meeting", "message", "email"] as TaskType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-1 rounded-xl py-2.5 px-2 text-xs font-bold transition-all border ${
                      type === t
                        ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    {TASK_ICONS[t]}
                    <span className="capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Note / Title</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Discuss currency exchange rate details..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm font-medium text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isFutureDate}
                className="flex-2 flex-grow-[2] rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-2.5 text-sm font-bold text-white hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 shadow-md shadow-emerald-600/20 transition-all"
              >
                {saving ? "Saving…" : "Set Reminder"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
