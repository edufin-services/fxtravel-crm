"use client";

import { useState, useEffect } from "react";

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultToken?: string;
}

export default function GoogleSheetsModal({
  isOpen,
  onClose,
  defaultToken = "fx_sheets_sync_2026",
}: GoogleSheetsModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [origin, setOrigin] = useState("");
  const [activeTab, setActiveTab] = useState<"script" | "guide" | "test">("script");

  // Test Simulator State
  const [testName, setTestName] = useState("Rajesh Sharma");
  const [testPhone, setTestPhone] = useState("+91 98765 43210");
  const [testEmail, setTestEmail] = useState("rajesh.sharma@example.com");
  const [testCity, setTestCity] = useState("Mumbai");
  const [testService, setTestService] = useState("Outward Remittance");
  const [testValue, setTestValue] = useState("150000");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; leadId?: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const webhookUrl = `${origin || "https://your-crm-domain.com"}/api/webhooks/google-sheets`;

  const appsScriptCode = `/**
 * FXTravel & Forex CRM - Google Sheets Real-Time Ingestion Script
 * -------------------------------------------------------------
 * Automatically pushes newly added rows to your CRM instantly.
 */

const CRM_WEBHOOK_URL = "${webhookUrl}";
const CRM_AUTH_TOKEN = "${defaultToken}";

/**
 * Main trigger function: Syncs any unsynced rows to CRM
 */
function syncRowToCRM(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1) return; // Empty or only headers

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Find or create 'CRM Status' column
  let statusColIndex = headers.indexOf("CRM Status") + 1;
  if (statusColIndex === 0) {
    statusColIndex = lastCol + 1;
    sheet.getRange(1, statusColIndex).setValue("CRM Status");
    sheet.getRange(1, statusColIndex).setFontWeight("bold").setBackground("#e6f4ea");
  }

  // Read all rows
  const dataRange = sheet.getRange(2, 1, lastRow - 1, headers.length);
  const rows = dataRange.getValues();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const currentStatus = sheet.getRange(rowNumber, statusColIndex).getValue();

    // Skip already synced rows
    if (currentStatus && currentStatus.toString().includes("Synced")) {
      continue;
    }

    // Build payload mapping column header -> cell value
    const rowData = { _rowNumber: rowNumber };
    let hasData = false;

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const val = rows[i][j];
      if (header && val !== "") {
        rowData[header] = val;
        hasData = true;
      }
    }

    // Only process if row has meaningful contact info
    if (!hasData) continue;

    try {
      const options = {
        method: "post",
        contentType: "application/json",
        headers: {
          "x-crm-token": CRM_AUTH_TOKEN
        },
        payload: JSON.stringify(rowData),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(CRM_WEBHOOK_URL, options);
      const resData = JSON.parse(response.getContentText());

      if (resData.status === "success" || resData.status === "ignored") {
        const leadRef = resData.leadId ? " (#" + resData.leadId.slice(0, 8) + ")" : "";
        sheet.getRange(rowNumber, statusColIndex)
          .setValue("Synced ✅" + leadRef)
          .setFontColor("#137333");
      } else {
        sheet.getRange(rowNumber, statusColIndex)
          .setValue("Error: " + (resData.error || "Failed"))
          .setFontColor("#c5221f");
      }
    } catch (err) {
      sheet.getRange(rowNumber, statusColIndex)
        .setValue("Failed ⚠️: " + err.message)
        .setFontColor("#b06000");
    }
  }
}

/**
 * 1-Click Trigger Setup:
 * Run this function once inside Apps Script to enable automatic sync on every change!
 */
function createSyncTrigger() {
  const ss = SpreadsheetApp.getActive();
  
  // Remove duplicate triggers first
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "syncRowToCRM") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create instant onChange trigger
  ScriptApp.newTrigger("syncRowToCRM")
    .forSpreadsheet(ss)
    .onChange()
    .create();

  // Create onEdit trigger for instant single-cell updates
  ScriptApp.newTrigger("syncRowToCRM")
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert("Real-time CRM Sync Trigger activated successfully! 🚀");
}
`;

  const copyToClipboard = (text: string, type: "url" | "token" | "script") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === "token") {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else if (type === "script") {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/webhooks/google-sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-crm-token": defaultToken,
        },
        body: JSON.stringify({
          Name: testName,
          Mobile: testPhone,
          Email: testEmail,
          City: testCity,
          "Service Type": testService,
          Value: testValue,
          Remarks: "Simulated from Admin Integrations Portal",
          _rowNumber: Math.floor(Math.random() * 100) + 2,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.status === "success" || data.status === "ignored")) {
        setTestResult({
          success: true,
          message: data.message || "Lead successfully ingested!",
          leadId: data.leadId,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Failed to process lead",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Network error",
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-zinc-200/80 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 bg-linear-to-r from-emerald-50/50 via-white to-teal-50/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 text-xl font-bold">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-zinc-900 tracking-tight">Google Sheets Real-Time Sync</h2>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                  Instant Auto-Ingest
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Sync leads from any Google Sheet or connected Google Form directly into CRM in 0-seconds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Credentials Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 py-3 bg-zinc-50 border-b border-zinc-100 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Webhook URL</span>
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-zinc-200 font-mono text-[11px] text-zinc-800">
              <span className="truncate mr-2">{webhookUrl}</span>
              <button
                onClick={() => copyToClipboard(webhookUrl, "url")}
                className="shrink-0 text-xs font-bold text-emerald-600 hover:text-emerald-700 font-sans"
              >
                {copiedUrl ? "Copied! ✓" : "Copy"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Auth Secret Token</span>
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-zinc-200 font-mono text-[11px] text-zinc-800">
              <span className="truncate mr-2">{defaultToken}</span>
              <button
                onClick={() => copyToClipboard(defaultToken, "token")}
                className="shrink-0 text-xs font-bold text-emerald-600 hover:text-emerald-700 font-sans"
              >
                {copiedToken ? "Copied! ✓" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 bg-white px-6">
          <button
            onClick={() => setActiveTab("script")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === "script"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>📜</span> Google Apps Script Code
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === "guide"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>📖</span> 4-Step Setup Guide
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === "test"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>⚡</span> Test Ingestion Simulator
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: SCRIPT */}
          {activeTab === "script" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Google Apps Script Code</h3>
                  <p className="text-xs text-zinc-500">
                    Paste this into your Google Sheet under <strong>Extensions &gt; Apps Script</strong>.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(appsScriptCode, "script")}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
                >
                  <span>{copiedScript ? "✓ Copied to Clipboard!" : "📋 Copy Full Script"}</span>
                </button>
              </div>

              <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-[340px] shadow-inner leading-relaxed">
                <pre>{appsScriptCode}</pre>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-start gap-2.5">
                <span className="text-base">💡</span>
                <div>
                  <span className="font-bold">Column Headers Support:</span> The script automatically maps any columns named:
                  <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-[10px]">
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">Name / Full Name</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">Phone / Mobile</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">Email</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">City / Location</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">Service / Category</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">Budget / Value</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">Notes / Remarks</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SETUP GUIDE */}
          {activeTab === "guide" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-900">How to link your Google Sheet in 60 seconds</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">1</span>
                    <h4 className="text-xs font-bold text-zinc-900">Open Google Sheet &amp; Apps Script</h4>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    Open your Google Sheet containing leads (or a sheet connected to Google Forms). Click top menu <strong>Extensions &gt; Apps Script</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">2</span>
                    <h4 className="text-xs font-bold text-zinc-900">Paste Code &amp; Save</h4>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    Delete any default code in the editor, paste the script from the <strong>Script Code</strong> tab, and press <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-mono text-[10px]">Ctrl+S</kbd> to save.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">3</span>
                    <h4 className="text-xs font-bold text-zinc-900">Run 1-Click Trigger Setup</h4>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    In the Apps Script toolbar, select the function <code className="text-emerald-700 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-zinc-200">createSyncTrigger</code> from the dropdown and click <strong>▶ Run</strong>. Grant permissions once.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">4</span>
                    <h4 className="text-xs font-bold text-zinc-900">Enjoy Automatic 0-Second Sync!</h4>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    Any row added manually or via Google Forms will immediately sync to CRM, and a new column <strong className="text-emerald-700">CRM Status</strong> will confirm <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono">Synced ✅</code>.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2">
                <span className="text-base">🛡️</span>
                <p>
                  <strong>Smart Deduplication:</strong> The CRM will automatically skip duplicate leads with the same phone number submitted within 12 hours, ensuring accidental double-edits on a sheet won&apos;t duplicate leads.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: TEST SIMULATOR */}
          {activeTab === "test" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Test Live Ingestion Simulator</h3>
                <p className="text-xs text-zinc-500">
                  Simulate a Google Sheet row ingestion to verify that your webhook and database are operating perfectly.
                </p>
              </div>

              <form onSubmit={handleTestSubmit} className="space-y-4 rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600">Full Name</label>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-600">Mobile / Phone</label>
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-600">Email Address</label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-600">City / Location</label>
                    <input
                      type="text"
                      value={testCity}
                      onChange={(e) => setTestCity(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-600">Service Type</label>
                    <select
                      value={testService}
                      onChange={(e) => setTestService(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Outward Remittance">Outward Remittance</option>
                      <option value="Currency Exchange">Currency Exchange</option>
                      <option value="Forex Card Reload">Forex Card Reload</option>
                      <option value="International SIM">International SIM</option>
                      <option value="Tours & Packages">Tours & Packages</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-600">Deal Value (₹)</label>
                    <input
                      type="number"
                      value={testValue}
                      onChange={(e) => setTestValue(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
                  <div className="text-xs">
                    {testResult && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold ${
                          testResult.success
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {testResult.success ? "✓" : "✕"} {testResult.message}
                        {testResult.leadId && ` (ID: ${testResult.leadId.slice(0, 8)}...)`}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={testLoading}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {testLoading ? "Sending..." : "🚀 Ingest Test Lead"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-6 py-3">
          <span className="text-[11px] text-zinc-400 font-medium">
            Endpoint: <code className="font-mono text-zinc-600">POST /api/webhooks/google-sheets</code>
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
