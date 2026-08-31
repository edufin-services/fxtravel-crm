import { redirect } from "next/navigation";
import { getEmailReportLogs, getReportSettings } from "@/lib/db";
import { getSession } from "@/lib/session";
import AdminMailClient from "./AdminMailClient";

export const dynamic = "force-dynamic";

export default async function AdminMailPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [settings, logs] = await Promise.all([
    getReportSettings(),
    getEmailReportLogs(30),
  ]);

  const envRecipient = process.env.E_EMAIL || process.env.ADMIN_EMAIL || "admin@fxpertise.com";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Automated Mail &amp; Digest Dispatcher</h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-200">
              Live Cron Relay
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Automated daily and weekly executive summaries covering stage transitions, newly acquired inquiries, and confirmed orders
          </p>
        </div>
      </div>

      {/* Main Mail & Reports Control Center */}
      <AdminMailClient
        initialSettings={settings}
        initialLogs={logs}
        envRecipient={envRecipient}
      />
    </div>
  );
}
