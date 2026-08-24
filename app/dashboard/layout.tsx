import { redirect } from "next/navigation";
import Logo from "../components/Logo";
import GlobalSearch from "./GlobalSearch";
import NotificationsBell from "./NotificationsBell";
import UserMenu from "./UserMenu";
import EventNotifications from "./EventNotifications";
import { getUserById } from "@/lib/db";
import { getSession } from "@/lib/session";
import Sidebar from "./Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Admin has their own panel — don't let them into the user dashboard
  if (session?.isAdmin) {
    redirect("/admin");
  }

  const user = session?.userId ? await getUserById(session.userId) : undefined;

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo />
          </div>

          <GlobalSearch />

          <div className="flex items-center gap-3">
            <NotificationsBell />
            <UserMenu name={user.name} company={user.company} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <EventNotifications />
    </div>
  );
}
