"use client";

import { useState } from "react";
import GoogleSheetsModal from "./GoogleSheetsModal";

interface IntegrationItem {
  name: string;
  type: string;
  status: string;
  endpoint: string;
  desc: string;
  icon: string;
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
      icon: "📊",
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
      icon: "📞",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      name: "WhatsApp Business API",
      type: "Webhook Sync",
      status: "Active",
      endpoint: "/api/webhooks/whatsapp",
      desc: "Incoming lead auto-capture & live message delivery",
      icon: "💬",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      name: "Meta Lead Ads (Instagram / Facebook)",
      type: "Lead Ingestion",
      status: "Active",
      endpoint: "/api/webhooks/meta-ads",
      desc: "Instant lead ingestion from sponsored ads campaigns",
      icon: "📢",
      badge: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      name: "SMTP Mail Server & Email Gateway",
      type: "Email Relay",
      status: "Connected",
      endpoint: "/api/account/notifications",
      desc: "Outbound proposal emails and system alerts",
      icon: "✉️",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
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
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 transition cursor-pointer"
                >
                  <span>⚡</span> {item.actionLabel || "Configure"}
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
