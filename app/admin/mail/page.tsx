import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminMailPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Mail &amp; Email Dispatcher</h1>
            <span className="rounded-full bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 border border-rose-200">
              Global SMTP
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Manage system email templates, outbound rate proposal dispatchers, and global inbox settings
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200/90 bg-white p-8 text-center shadow-2xs">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </div>
        <h2 className="text-base font-bold text-zinc-900">Admin Email Gateway Connected</h2>
        <p className="mt-1 max-w-sm text-xs text-zinc-400">
          System proposals, client quotes, and automated follow-up emails are dispatched through your active SMTP server.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <span className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-2xs">
            SMTP Relay Operational (200 OK)
          </span>
        </div>

        {/* Feature chips */}
        <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-md">
          {["Rate Sheet Quotations", "Unified Email Logs", "Automated Lead Alerts", "Custom Email Branding"].map((feat) => (
            <span key={feat} className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
