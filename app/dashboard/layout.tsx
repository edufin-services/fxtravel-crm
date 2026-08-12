import { redirect } from "next/navigation";
import Logo from "../components/Logo";
import GlobalSearch from "./GlobalSearch";
import NavLink from "./NavLink";
import NotificationsBell from "./NotificationsBell";
import UserMenu from "./UserMenu";
import EventNotifications from "./EventNotifications";
import { getUserById } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  GridIcon,
  ChatIcon,
  FunnelIcon,
  ChartIcon,
  CalendarIcon,
  ListIcon,
  RobotIcon,
  MailIcon,
  GlobeIcon,
  TaskIcon,
  TrashIcon,
  UserCheckIcon,
} from "./icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: <GridIcon /> },
  { href: "/dashboard/leads", label: "Leads", icon: <FunnelIcon /> },
  { href: "/dashboard/chats", label: "Chats", icon: <ChatIcon /> },
  { href: "/dashboard/calendar", label: "Calendar", icon: <CalendarIcon /> },
  { href: "/dashboard/lists", label: "Lists", icon: <ListIcon /> },
  { href: "/dashboard/mail", label: "Mail", icon: <MailIcon /> },
  { href: "/dashboard/stats", label: "Stats", icon: <ChartIcon /> },
  { href: "/dashboard/trash", label: "Trash", icon: <TrashIcon /> },
];

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
      <aside className="hidden w-60 flex-col bg-white border-r border-zinc-200/80 px-3.5 py-5 lg:flex shadow-xs z-20">
        <div className="px-2 flex items-center justify-between">
          <Logo />
          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
            PRO
          </span>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon}>
              {item.label}
            </NavLink>
          ))}
        </nav>

      </aside>

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
