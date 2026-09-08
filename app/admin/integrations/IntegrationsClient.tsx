"use client";

import { useState } from "react";
import GoogleSheetsModal from "./GoogleSheetsModal";

interface IntegrationItem {
  name: string;
  type: string;
  status: string;
  endpoint: string;
  desc: string;
  icon: React.ReactNode;
  badge: string;
  isActionable?: boolean;
  actionLabel?: string;
}

export default function IntegrationsClient({
  googleSheetsToken = "fx_sheets_sync_2026",
}: {
  googleSheetsToken?: string;
}) {
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  const integrations: IntegrationItem[] = [
    {
      name: "Google Sheets Real-Time Sync",
      type: "Instant 0s Auto-Ingest",
      status: "Active",
      endpoint: "/api/webhooks/google-sheets",
      desc: "Automatically sync new rows, leads & Google Form submissions directly into CRM",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      isActionable: true,
      actionLabel: "Setup & Apps Script Code",
    },
    {
      name: "Justdial Lead API & Push Webhook",
      type: "Real-time Lead Ingestion",
      status: "Active",
      endpoint: "/api/webhooks/justdial",
      desc: "Automatic lead capture for Money Transfer, Forex & International Tours",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
      badge: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      name: "WhatsApp Business API",
      type: "Webhook Sync",
      status: "Active",
      endpoint: "/api/webhooks/whatsapp",
      desc: "Incoming lead auto-capture & live message delivery",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      name: "Meta Lead Ads (Instagram / Facebook)",
      type: "Lead Ingestion",
      status: "Active",
      endpoint: "/api/webhooks/meta-ads",
      desc: "Instant lead ingestion from sponsored ads campaigns",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
          <path d="m3 11 18-5v12L3 13v-2z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      ),
      badge: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      name: "SMTP Mail Server & Email Gateway",
      type: "Email Relay",
      status: "Connected",
      endpoint: "/api/account/notifications",
      desc: "Outbound proposal emails and system alerts",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
      badge: "bg-blue-50 text-blue-700 border-blue-200",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">System Integrations &amp; API Webhooks</h1>
            <span className="rounded-full bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 border border-rose-200">
              API Status
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Manage real-time communication webhooks, lead ingestion channels, and system gateway integrations
          </p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {integrations.map((item) => (
          <div
            key={item.name}
            className={`rounded-2xl border bg-white p-5 shadow-2xs space-y-3 transition ${
              item.isActionable
                ? "border-emerald-200 hover:border-emerald-400 hover:shadow-md ring-1 ring-emerald-500/10"
                : "border-zinc-200/90"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-lg">
                  {item.icon}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">{item.name}</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">{item.type}</p>
                </div>
              </div>

              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${item.badge}`}>
                {item.status}
              </span>
            </div>

            <p className="text-xs text-zinc-600 font-medium">{item.desc}</p>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
                {item.endpoint}
              </span>
              
              {item.isActionable ? (
                <button
                  onClick={() => setIsGoogleSheetsModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  {item.actionLabel || "Configure"}
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-700">Healthy (200 OK)</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Google Sheets Setup Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        defaultToken={googleSheetsToken}
      />
    </div>
  );
}
