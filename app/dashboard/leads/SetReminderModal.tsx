"use client";

import React, { useState, useEffect } from "react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { playReminderChime, requestNotificationPermission } from "@/lib/sound";

type TaskType = "call" | "email" | "meeting" | "message";

const TASK_ICONS: Record<TaskType, React.ReactNode> = {
  call: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round"/>
    </svg>
  ),
  meeting: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/>
    </svg>
  ),
  message: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round"/>
    </svg>
  ),
  email: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round"/>
      <polyline points="22,6 12,13 2,6" strokeLinecap="round"/>
    </svg>
  ),
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayLocalStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tomorrowLocalStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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

function getDefaultNote(type: TaskType, leadName: string) {
  switch (type) {
    case "call":
      return `Follow up call with ${leadName}`;
    case "meeting":
      return `Meeting with ${leadName}`;
    case "message":
      return `Send message to ${leadName}`;
    case "email":
      return `Send email to ${leadName}`;
  }
}

export default function SetReminderModal({
  leadId,
  leadName,
  initialReminderAt,
  initialNote,
  onClose,
  onSaved,
  onCleared,
}: {
  leadId: string;
  leadName: string;
  initialReminderAt?: string | null;
  initialNote?: string;
  onClose: () => void;
  onSaved: (reminderAt: string, reminderNote: string) => void;
  onCleared?: () => void;
}) {
  const hasExisting = Boolean(initialReminderAt && !isNaN(new Date(initialReminderAt).getTime()));
  const existingDate = hasExisting ? new Date(initialReminderAt!) : null;

  const [type, setType] = useState<TaskType>("call");
  const [note, setNote] = useState(() => initialNote || getDefaultNote("call", leadName));
  const [hasUserEditedNote, setHasUserEditedNote] = useState(Boolean(initialNote));
  const [preset, setPreset] = useState<"15m" | "1h" | "todayLater" | "tomorrow" | "custom">(
    hasExisting ? "custom" : "tomorrow"
  );

  // Initialize date & time state (from existing reminder if present)
  const [dateStr, setDateStr] = useState(() => {
    if (existingDate) {
      return `${existingDate.getFullYear()}-${pad(existingDate.getMonth() + 1)}-${pad(existingDate.getDate())}`;
    }
    return tomorrowLocalStr();
  });

  const [hour, setHour] = useState(() => {
    if (existingDate) {
      const h = existingDate.getHours();
      return h % 12 === 0 ? 12 : h % 12;
    }
    return 9;
  });

  const [minute, setMinute] = useState(() => {
    if (existingDate) {
      return existingDate.getMinutes();
    }
    return 0;
  });

  const [ampm, setAmpm] = useState<"AM" | "PM">(() => {
    if (existingDate) {
      return existingDate.getHours() >= 12 ? "PM" : "AM";
    }
    return "AM";
  });

  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  useBodyScrollLock();

  // Ask for notification permission opportunistically
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
  }, []);

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
    } else if (preset === "todayLater") {
      // 5:00 PM today, or in 2 hours if after 4 PM
      const target = new Date(now);
      if (now.getHours() < 16) {
        target.setHours(17, 0, 0, 0);
      } else {
        target.setTime(now.getTime() + 2 * 60 * 60 * 1000);
      }
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
    }
  }, [preset]);

  function handleTypeChange(newType: TaskType) {
    setType(newType);
    if (!hasUserEditedNote) {
      setNote(getDefaultNote(newType, leadName));
    }
  }

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

  async function handleClear() {
    setClearing(true);
    setError("");
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderAt: null }),
      });
      if (onCleared) {
        onCleared();
      }
      onClose();
    } catch {
      setError("Failed to remove reminder.");
    } finally {
      setClearing(false);
    }
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const previewText = formatPreview(dateStr, hour, minute, ampm);
  const isFutureDate = !isNaN(getTargetDate().getTime()) && getTargetDate().getTime() > Date.now();

  const isTodayAfter4 = new Date().getHours() >= 16;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity overscroll-contain"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] rounded-2xl bg-white shadow-2xl border border-zinc-200/90 flex flex-col max-h-[92vh] overflow-hidden animate-scaleIn overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/20 shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-zinc-900 leading-tight">
                  {hasExisting ? "Manage Reminder" : "Set Reminder"}
                </h3>
                <span className="rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 border border-emerald-200/60 leading-none">
                  CRM Alert
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                For: <span className="font-bold text-zinc-800">{leadName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Test sound button */}
            <button
              type="button"
              onClick={playReminderChime}
              className="flex h-7 px-2 items-center gap-1 rounded-lg text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors text-[11px] font-semibold"
              title="Test alert sound chime"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <span>Test chime</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
              title="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3">
          {/* Current Active Reminder Notice */}
          {hasExisting && existingDate && (
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 p-2.5 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <p className="truncate">
                  Active Reminder:{" "}
                  <strong>
                    {existingDate.toLocaleString("en-IN", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </strong>
                </p>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-900 shrink-0">
                Scheduled
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-none text-red-600">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Quick Presets</label>
              <span className="text-[10px] text-zinc-400 font-medium">One-click schedule</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { id: "15m", label: "+15 min" },
                { id: "1h", label: "+1 hour" },
                { id: "todayLater", label: isTodayAfter4 ? "+2 hours" : "Today 5pm" },
                { id: "tomorrow", label: "Tomorrow 9am" },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPreset(item.id)}
                  className={`rounded-xl py-1.5 px-1.5 text-xs font-bold transition-all border text-center truncate ${
                    preset === item.id
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-zinc-50 text-zinc-600 border-zinc-200/80 hover:bg-zinc-100 hover:border-zinc-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-side Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Date */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={dateStr}
                min={todayLocalStr()}
                onChange={(e) => { setDateStr(e.target.value); setPreset("custom"); }}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                Time
              </label>
              <div className="flex items-center gap-1">
                <select
                  value={hour}
                  onChange={(e) => { setHour(Number(e.target.value)); setPreset("custom"); }}
                  className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/80 px-2 py-1.5 text-xs font-semibold text-zinc-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>{pad(h)}</option>
                  ))}
                </select>
                <span className="text-zinc-400 font-bold text-xs">:</span>
                <select
                  value={minute}
                  onChange={(e) => { setMinute(Number(e.target.value)); setPreset("custom"); }}
                  className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/80 px-2 py-1.5 text-xs font-semibold text-zinc-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
                >
                  {minutes.map((m) => (
                    <option key={m} value={m}>{pad(m)}</option>
                  ))}
                </select>
                <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-0.5 shrink-0">
                  {(["AM", "PM"] as const).map((ap) => (
                    <button
                      key={ap}
                      type="button"
                      onClick={() => { setAmpm(ap); setPreset("custom"); }}
                      className={`px-2 py-1 text-[11px] font-black rounded-lg transition-all ${
                        ampm === ap
                          ? "bg-white text-emerald-700 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      {ap}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Action Type
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["call", "meeting", "message", "email"] as TaskType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition-all border ${
                    type === t
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-zinc-50 text-zinc-600 border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <span className={type === t ? "text-emerald-400" : "text-zinc-400"}>
                    {TASK_ICONS[t]}
                  </span>
                  <span className="capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note / Task Title */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Note / Reminder Title
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => { setNote(e.target.value); setHasUserEditedNote(true); }}
              placeholder="e.g. Discuss booking and visa requirements..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
            />
          </div>

          {/* Compact Fire Preview Banner */}
          {previewText && (
            <div
              className={`rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 border transition-all ${
                isFutureDate
                  ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-800"
                  : "bg-red-50/80 border-red-200/80 text-red-700"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-none text-emerald-600">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14" strokeLinecap="round"/>
                </svg>
                <span className="truncate text-xs">
                  {isFutureDate ? (
                    <>
                      Fires at: <span className="font-bold text-emerald-950">{previewText}</span>
                    </>
                  ) : (
                    "Selected time is in the past"
                  )}
                </span>
              </div>
              {isFutureDate && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                  Scheduled
                </span>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex-none px-5 py-3 border-t border-zinc-100 bg-zinc-50/60 flex items-center justify-between gap-2">
          {/* If existing reminder, show Clear/Delete button */}
          {hasExisting ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing || saving}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
              </svg>
              <span>{clearing ? "Removing…" : "Clear Reminder"}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || clearing || !isFutureDate}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-extrabold text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all"
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{hasExisting ? "Update Reminder" : "Set Reminder"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
