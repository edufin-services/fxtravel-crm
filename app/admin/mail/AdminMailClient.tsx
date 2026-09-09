"use client";

import { useState, useMemo } from "react";
import { EmailReportLog, ReportSettings } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format";

function parseTime24To12(timeStr: string) {
  const [hStr = "20", mStr = "00"] = (timeStr || "20:00").split(":");
  let hour24 = parseInt(hStr, 10);
  if (isNaN(hour24)) hour24 = 20;
  let minute = parseInt(mStr, 10);
  if (isNaN(minute)) minute = 0;

  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return { hour12, minute, period };
}

function formatTimeTo24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let hour24 = hour12;
  if (period === "AM") {
    hour24 = hour12 === 12 ? 0 : hour12;
  } else {
    hour24 = hour12 === 12 ? 12 : hour12 + 12;
  }
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTime12Hour(timeStr: string): string {
  const { hour12, minute, period } = parseTime24To12(timeStr);
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

interface Props {
  initialSettings: ReportSettings;
  initialLogs: EmailReportLog[];
}

export default function AdminMailClient({ initialSettings, initialLogs }: Props) {
  const [settings, setSettings] = useState<ReportSettings>(initialSettings);
  const [logs, setLogs] = useState<EmailReportLog[]>(initialLogs);
  const [isSendingDaily, setIsSendingDaily] = useState(false);
  const [isSendingWeekly, setIsSendingWeekly] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [recipientEmails, setRecipientEmails] = useState<string[]>(() => {
    if (initialSettings.recipientEmails && initialSettings.recipientEmails.length > 0) {
      return initialSettings.recipientEmails;
    }
    if (initialSettings.customRecipientEmail?.trim()) {
      return initialSettings.customRecipientEmail.split(",").map((e) => e.trim()).filter(Boolean);
    }
    return [];
  });
  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailInputError, setEmailInputError] = useState("");

  const [dailyTimeInput, setDailyTimeInput] = useState(settings.dailyReportTime || "20:00");
  const [dailyEnabled, setDailyEnabled] = useState(settings.dailyEnabled);
  const [weeklyEnabled, setWeeklyEnabled] = useState(settings.weeklyEnabled);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const timeParts = useMemo(() => parseTime24To12(dailyTimeInput), [dailyTimeInput]);

  function updateTime(h12: number, m: number, p: "AM" | "PM") {
    setDailyTimeInput(formatTimeTo24(h12, m, p));
  }

  function handleAddEmail() {
    setEmailInputError("");
    const raw = newEmailInput.trim();
    if (!raw) return;

    const tokens = raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
    const validEmails: string[] = [];
    const invalidEmails: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const token of tokens) {
      if (!emailRegex.test(token)) {
        invalidEmails.push(token);
      } else if (!recipientEmails.includes(token) && !validEmails.includes(token)) {
        validEmails.push(token);
      }
    }

    if (invalidEmails.length > 0) {
      setEmailInputError(`Invalid email format: ${invalidEmails.join(", ")}`);
      return;
    }

    if (validEmails.length === 0) {
      setEmailInputError("Email already in the list.");
      return;
    }

    setRecipientEmails((prev) => [...prev, ...validEmails]);
    setNewEmailInput("");
  }

  function handleRemoveEmail(emailToRemove: string) {
    setRecipientEmails((prev) => prev.filter((e) => e !== emailToRemove));
  }

  async function handleSendReport(period: "daily" | "weekly") {
    if (period === "daily") setIsSendingDaily(true);
    else setIsSendingWeekly(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          recipients: recipientEmails,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: "success",
          text: `Success: ${data.message} (${data.reportData?.stats?.totalNewLeads || 0} new leads, ${data.reportData?.stats?.totalStageChanges || 0} stage changes, ${data.reportData?.stats?.totalConfirmed || 0} confirmed).`,
        });
        // Refresh logs
        const logsRes = await fetch("/api/admin/reports");
        const logsData = await logsRes.json();
        if (logsData.logs) setLogs(logsData.logs);
        if (logsData.settings) setSettings(logsData.settings);
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || data.message || "Failed to dispatch report.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Network error while dispatching report.",
      });
    } finally {
      setIsSendingDaily(false);
      setIsSendingWeekly(false);
    }
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmails,
          dailyReportTime: dailyTimeInput,
          dailyEnabled,
          weeklyEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        if (data.settings.recipientEmails) {
          setRecipientEmails(data.settings.recipientEmails);
        }
        setStatusMessage({ type: "success", text: "Automated report settings saved successfully." });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to save settings." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Network error saving settings." });
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Alert status notification banner */}
      {statusMessage && (
        <div
          className={`rounded-2xl p-4 text-xs font-semibold flex items-center justify-between border shadow-2xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs">
                ✓
              </span>
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-200 text-rose-900 font-bold text-xs">
                ✕
              </span>
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-500 hover:text-zinc-900 cursor-pointer font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid: 2 Automation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Automation Card */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 font-bold">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Daily Lead &amp; Pipeline Digest</h3>
                  <p className="text-[11px] text-zinc-500">Every 24 Hours</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                  dailyEnabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200"
                }`}
              >
                {dailyEnabled ? "Active & Running" : "Disabled"}
              </span>
            </div>

            <div className="rounded-xl bg-zinc-50 p-3.5 space-y-2 border border-zinc-100 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span className="font-medium">Schedule Timing:</span>
                <span className="font-bold text-zinc-900">{formatTime12Hour(settings.dailyReportTime || "20:00")} IST</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span className="font-medium">Data Scope:</span>
                <span className="font-semibold text-zinc-800">Past 24 Hours Changelog</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span className="font-medium">Last Dispatched:</span>
                <span className="font-bold text-zinc-900">
                  {settings.lastDailySentAt ? formatRelativeTime(settings.lastDailySentAt) : "Pending next cycle"}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 leading-relaxed">
              Includes all newly acquired inquiries, full stage progression timeline, confirmed deals with values, and executive activity metrics.
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Manual trigger</span>
            <button
              onClick={() => handleSendReport("daily")}
              disabled={isSendingDaily || isSendingWeekly}
              className="cursor-pointer rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-3.5 py-2 text-xs shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSendingDaily ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Dispatching Daily...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Send Daily Report Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Weekly Automation Card */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 font-bold">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Weekly Executive Summary</h3>
                  <p className="text-[11px] text-zinc-500">Every 7 Days (Sunday Evening)</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                  weeklyEnabled
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200"
                }`}
              >
                {weeklyEnabled ? "Active & Running" : "Disabled"}
              </span>
            </div>

            <div className="rounded-xl bg-zinc-50 p-3.5 space-y-2 border border-zinc-100 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span className="font-medium">Scheduled Day:</span>
                <span className="font-bold text-zinc-900">Every Sunday at {formatTime12Hour(settings.dailyReportTime || "20:00")} IST</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span className="font-medium">Data Scope:</span>
                <span className="font-semibold text-zinc-800">Past 7 Days Aggregation</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span className="font-medium">Last Dispatched:</span>
                <span className="font-bold text-zinc-900">
                  {settings.lastWeeklySentAt ? formatRelativeTime(settings.lastWeeklySentAt) : "Pending next cycle"}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 leading-relaxed">
              Consolidates weekly conversion volume, deal values, lead channel attribution, and performance charts for executive review.
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Manual trigger</span>
            <button
              onClick={() => handleSendReport("weekly")}
              disabled={isSendingDaily || isSendingWeekly}
              className="cursor-pointer rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-3.5 py-2 text-xs shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSendingWeekly ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Dispatching Weekly...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-purple-400">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Send Weekly Report Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Configuration Card */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-zinc-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 tracking-tight">Automation Settings &amp; Schedule Config</h3>
              <p className="text-xs text-zinc-500 font-medium">Configure scheduled delivery rules, recipient targets, and dispatch hours</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              In-Process Cron Active
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Part 1: Recipient Distribution List */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800">
                    Recipient Distribution List
                  </h4>
                  <span className="rounded-full bg-zinc-900 text-white text-[10px] font-extrabold px-2 py-0.5">
                    {recipientEmails.length} {recipientEmails.length === 1 ? "Email" : "Emails"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  These email addresses receive all automated daily digests and weekly summaries.
                </p>
              </div>

              {recipientEmails.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRecipientEmails([])}
                  className="text-[11px] font-semibold text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Integrated Input Group */}
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3.5 text-zinc-400">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <input
                type="email"
                value={newEmailInput}
                onChange={(e) => {
                  setNewEmailInput(e.target.value);
                  if (emailInputError) setEmailInputError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEmail();
                  }
                }}
                placeholder="Enter email address (e.g. manager@fxpertise.in) and press Enter..."
                className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-24 py-2.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 focus:outline-none transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="absolute right-1.5 top-1.5 bottom-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-3 text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add
              </button>
            </div>
            {emailInputError && (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                <span>⚠️</span> {emailInputError}
              </p>
            )}

            {/* Recipient Pills List */}
            <div className="flex flex-wrap gap-2 pt-1 min-h-[44px] items-center">
              {recipientEmails.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200/70 rounded-xl px-3.5 py-2 w-full">
                  <span>ℹ️</span>
                  <span>No recipients configured. Automated digests will remain paused until at least one email is added.</span>
                </div>
              ) : (
                recipientEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 shadow-2xs transition-all hover:border-zinc-300"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                      {email[0]?.toUpperCase()}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-zinc-700">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md p-1 transition-colors cursor-pointer"
                      title={`Remove ${email}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Part 2: Schedule & Automation Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Daily Digest Setting Card */}
            <div
              className={`rounded-xl border p-5 transition-all flex flex-col justify-between ${
                dailyEnabled ? "border-emerald-200/90 bg-emerald-50/20" : "border-zinc-200/80 bg-zinc-50/40"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold ${
                        dailyEnabled ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-zinc-200/70 text-zinc-500"
                      }`}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">Daily Pipeline Digest</h4>
                      <p className="text-[11px] text-zinc-500">Every 24h recap of activity &amp; new inquiries</p>
                    </div>
                  </div>

                  {/* Modern Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={dailyEnabled}
                    onClick={() => setDailyEnabled(!dailyEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      dailyEnabled ? "bg-emerald-500" : "bg-zinc-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        dailyEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Schedule Time Selector inside daily card */}
              <div className="mt-5 pt-4 border-t border-zinc-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-bold">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 14 14" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-black text-zinc-900">Daily Dispatch Timing</span>
                      <span className="text-[10px] text-zinc-400 ml-1.5 font-medium">Asia/Kolkata (IST)</span>
                    </div>
                  </div>

                  {/* Live Status Pill */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{formatTime12Hour(dailyTimeInput)} IST</span>
                  </div>
                </div>

                {/* Digital Stepper & Schedule Controller */}
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Digital Clock Stepper Controls */}
                    <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-zinc-200/90 shadow-2xs">
                      {/* Hour Stepper */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => {
                            const next = timeParts.hour12 === 12 ? 1 : timeParts.hour12 + 1;
                            updateTime(next, timeParts.minute, timeParts.period);
                          }}
                          className="text-zinc-400 hover:text-zinc-900 p-0.5 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                          title="Increase hour"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <span className="w-9 text-center font-mono text-base font-black text-zinc-900 select-none py-0.5">
                          {String(timeParts.hour12).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const prev = timeParts.hour12 === 1 ? 12 : timeParts.hour12 - 1;
                            updateTime(prev, timeParts.minute, timeParts.period);
                          }}
                          className="text-zinc-400 hover:text-zinc-900 p-0.5 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                          title="Decrease hour"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>

                      <span className="text-base font-black text-zinc-300 select-none pb-0.5">:</span>

                      {/* Minute Stepper */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => {
                            const next = (Math.floor(timeParts.minute / 5) * 5 + 5) % 60;
                            updateTime(timeParts.hour12, next, timeParts.period);
                          }}
                          className="text-zinc-400 hover:text-zinc-900 p-0.5 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                          title="Increase minute (+5)"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <span className="w-9 text-center font-mono text-base font-black text-zinc-900 select-none py-0.5">
                          {String(timeParts.minute).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const prev = (Math.ceil(timeParts.minute / 5) * 5 - 5 + 60) % 60;
                            updateTime(timeParts.hour12, prev, timeParts.period);
                          }}
                          className="text-zinc-400 hover:text-zinc-900 p-0.5 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                          title="Decrease minute (-5)"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>

                      {/* AM / PM Segmented Buttons */}
                      <div className="flex flex-col gap-1 pl-1.5 ml-1 border-l border-zinc-200">
                        <button
                          type="button"
                          onClick={() => updateTime(timeParts.hour12, timeParts.minute, "AM")}
                          className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all cursor-pointer border ${
                            timeParts.period === "AM"
                              ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                              : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900"
                          }`}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTime(timeParts.hour12, timeParts.minute, "PM")}
                          className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all cursor-pointer border ${
                            timeParts.period === "PM"
                              ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                              : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900"
                          }`}
                        >
                          PM
                        </button>
                      </div>
                    </div>

                    {/* Quick Presets Grid */}
                    <div className="flex-1 min-w-[180px] space-y-1">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                        Quick Schedules
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: "8:00 PM (Default)", time: "20:00" },
                          { label: "6:00 PM (EOD)", time: "18:00" },
                          { label: "9:00 PM (Night)", time: "21:00" },
                          { label: "9:00 AM (Morning)", time: "09:00" },
                        ].map((preset) => {
                          const isSelected = dailyTimeInput === preset.time;
                          return (
                            <button
                              key={preset.time}
                              type="button"
                              onClick={() => setDailyTimeInput(preset.time)}
                              className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all text-left flex items-center justify-between border ${
                                isSelected
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs font-extrabold"
                                  : "bg-white text-zinc-600 border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900"
                              }`}
                            >
                              <span>{preset.label}</span>
                              {isSelected && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Optional exact time field */}
                  <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-xs text-zinc-500">
                    <span className="text-[11px] font-medium text-zinc-500">Exact time override:</span>
                    <input
                      type="time"
                      value={dailyTimeInput}
                      onChange={(e) => {
                        if (e.target.value) setDailyTimeInput(e.target.value);
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-800 focus:border-zinc-900 focus:outline-none shadow-2xs cursor-pointer"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 leading-snug">
                  Every day at <strong className="text-zinc-900">{formatTime12Hour(dailyTimeInput)} IST</strong>, the in-process cron will query previous 24h inquiry updates and send digest emails.
                </p>
              </div>
            </div>

            {/* Weekly Digest Setting Card */}
            <div
              className={`rounded-xl border p-5 transition-all flex flex-col justify-between ${
                weeklyEnabled ? "border-purple-200/90 bg-purple-50/20" : "border-zinc-200/80 bg-zinc-50/40"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold ${
                        weeklyEnabled ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-zinc-200/70 text-zinc-500"
                      }`}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">Weekly Executive Digest</h4>
                      <p className="text-[11px] text-zinc-500">7-day executive rollup of confirmed deals &amp; revenue</p>
                    </div>
                  </div>

                  {/* Modern Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={weeklyEnabled}
                    onClick={() => setWeeklyEnabled(!weeklyEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      weeklyEnabled ? "bg-purple-600" : "bg-zinc-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        weeklyEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-500">Scheduled Cadence:</span>
                    <span className="font-bold text-zinc-900">Every Sunday Evening</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-500">Scheduled Time:</span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 text-[11px] font-bold">
                      {formatTime12Hour(dailyTimeInput)} IST
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-500">Data Scope:</span>
                    <span className="font-semibold text-zinc-700">Past 7 Calendar Days</span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 leading-snug">
                  The weekly report automatically triggers every Sunday evening at <strong className="text-zinc-900">{formatTime12Hour(dailyTimeInput)} IST</strong>, summarizing overall conversion percentages, revenue volumes, and agent performance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Footer Bar with Save Button */}
        <div className="px-6 py-4 bg-zinc-50/80 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
            <span>Changes are saved to the persistent database and apply to the next scheduled run.</span>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="cursor-pointer rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-6 py-2.5 text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSavingSettings ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Saving Preferences...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dispatched Report Logs Table */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-zinc-900">Email Dispatch Delivery Logs</h3>
            <p className="text-xs text-zinc-500 font-medium">History of automated and on-demand report emails</p>
          </div>
          <span className="rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold px-2.5 py-0.5">
            {logs.length} Total Logs
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Dispatched At</th>
                <th className="px-4 py-3">Report Type</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3 text-center">New Leads</th>
                <th className="px-4 py-3 text-center">Stage Changes</th>
                <th className="px-4 py-3 text-center">Confirmed Deals</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-400 font-medium">
                    No email reports have been dispatched yet. Click "Send Daily Report Now" above to trigger your first digest.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-zinc-900">{formatRelativeTime(log.sentAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          log.reportType === "weekly"
                            ? "bg-purple-100 text-purple-800"
                            : log.reportType === "daily"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {log.reportType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-700">{log.recipient}</td>
                    <td className="px-4 py-3 text-center font-bold text-zinc-900">+{log.leadCount}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">{log.stageChangeCount}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-700">{log.confirmedCount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          log.status === "success"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-rose-100 text-rose-800 border-rose-200"
                        }`}
                      >
                        {log.status === "success" ? "Delivered" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
