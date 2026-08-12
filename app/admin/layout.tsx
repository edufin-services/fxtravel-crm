import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdminSidebar from "./AdminSidebar";
import AdminSearch from "./AdminSearch";
import NotificationsBell from "../dashboard/NotificationsBell";
import UserMenu from "../dashboard/UserMenu";

import { getAdminSettings } from "@/lib/db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const adminSettings = await getAdminSettings();
  const adminEmail = adminSettings?.email || process.env.ADMIN_EMAIL || "admin@fxpertise.com";
  const adminName = adminSettings?.name || "Admin";
  const adminCompany = adminSettings?.company || "Fxpertise";

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <AdminSidebar adminEmail={adminEmail} />

      {/* ── Main Workspace ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 shadow-xs">
          <AdminSearch />

          <div className="flex items-center gap-3">
            <NotificationsBell />
            <UserMenu name={adminName} company={adminCompany} profileHref="/admin/profile" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
