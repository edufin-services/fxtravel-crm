"use client";

import { useState } from "react";
import { EmailReportLog, ReportSettings } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format";

interface Props {
  initialSettings: ReportSettings;
  initialLogs: EmailReportLog[];
  envRecipient: string;
}

export default function AdminMailClient({ initialSettings, initialLogs, envRecipient }: Props) {
  const [settings, setSettings] = useState<ReportSettings>(initialSettings);
  const [logs, setLogs] = useState<EmailReportLog[]>(initialLogs);
  const [isSendingDaily, setIsSendingDaily] = useState(false);
  const [isSendingWeekly, setIsSendingWeekly] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [recipientInput, setRecipientInput] = useState(settings.customRecipientEmail || "");
  const [dailyTimeInput, setDailyTimeInput] = useState(settings.dailyReportTime || "20:00");
  const [dailyEnabled, setDailyEnabled] = useState(settings.dailyEnabled);
  const [weeklyEnabled, setWeeklyEnabled] = useState(settings.weeklyEnabled);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const effectiveRecipient = recipientInput.trim() || envRecipient || "Not configured";

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
          recipient: recipientInput.trim() || undefined,
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
          customRecipientEmail: recipientInput.trim(),
          dailyReportTime: dailyTimeInput,
          dailyEnabled,
          weeklyEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
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

      {/* Target Recipient Banner */}
      <div className="rounded-2xl border border-zinc-200/90 bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 text-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                Automated Digest Target
              </span>
              <span className="text-xs text-zinc-400 font-mono">E_EMAIL</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">{effectiveRecipient}</h2>
            <p className="text-xs text-zinc-400">
              All lead creations, stage transitions, and confirmed lead milestones are compiled and delivered automatically to this email.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSendReport("daily")}
              disabled={isSendingDaily || isSendingWeekly}
              className="cursor-pointer rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold px-4 py-2.5 text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSendingDaily ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent"></span>
                  Dispatching Daily...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Send Daily Report Now
                </>
              )}
            </button>

            <button
              onClick={() => handleSendReport("weekly")}
              disabled={isSendingDaily || isSendingWeekly}
              className="cursor-pointer rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 text-xs border border-white/15 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSendingWeekly ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Dispatching Weekly...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

      {/* Grid: 2 Automation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Automation Card */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 font-bold">
                ⚡
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
              <span className="font-bold text-zinc-900">{settings.dailyReportTime || "20:00"} IST</span>
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

        {/* Weekly Automation Card */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 font-bold">
                📅
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
              <span className="font-bold text-zinc-900">Every Sunday at {settings.dailyReportTime || "20:00"} IST</span>
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
      </div>

      {/* Settings Configuration Card */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h3 className="text-sm font-black text-zinc-900">Automation Settings &amp; Schedule Config</h3>
          <span className="text-[11px] font-medium text-zinc-400">Background In-Process Scheduler</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">Custom Recipient Email (Optional)</label>
            <input
              type="email"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              placeholder={`Default: ${envRecipient || "E_EMAIL"}`}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-zinc-400">Leave blank to use environment default ({envRecipient || "E_EMAIL"})</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">Daily Dispatch Time (IST)</label>
            <input
              type="time"
              value={dailyTimeInput}
              onChange={(e) => setDailyTimeInput(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-800 focus:border-zinc-900 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-zinc-400">Time when daily report sends (Asia/Kolkata)</p>
          </div>

          <div className="flex flex-col justify-center space-y-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800">
              <input
                type="checkbox"
                checked={dailyEnabled}
                onChange={(e) => setDailyEnabled(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-0"
              />
              Enable Automatic Daily Reports
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800">
              <input
                type="checkbox"
                checked={weeklyEnabled}
                onChange={(e) => setWeeklyEnabled(e.target.checked)}
                className="rounded text-purple-600 focus:ring-0"
              />
              Enable Automatic Weekly Reports
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="cursor-pointer rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-5 py-2 text-xs transition-colors disabled:opacity-50"
          >
            {isSavingSettings ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>

      {/* Dispatched Report Logs Table */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-zinc-900">Email Dispatch Delivery Logs</h3>
            <p className="text-xs text-zinc-500 font-medium">History of automated and on-demand report emails sent to {effectiveRecipient}</p>
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
                    <td className="px-4 py-3 text-center font-bold text-emerald-700">🎯 {log.confirmedCount}</td>
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
