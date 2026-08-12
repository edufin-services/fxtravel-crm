"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/leads",
    label: "All Leads",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/agents",
    label: "Users",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Users & Roles",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    href: "/admin/calendar",
    label: "Calendar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: "/admin/mail",
    label: "Mail",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
    ),
  },
  {
    href: "/admin/audit",
    label: "Audit Stream",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    href: "/admin/trash",
    label: "Trash",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 flex-col bg-white border-r border-zinc-200/80 px-3.5 py-5 lg:flex shadow-xs z-20">
      {/* Logo area */}
      <div className="px-2 flex items-center justify-between">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Fxpertise CRM"
            width={180}
            height={50}
            className="h-11 max-w-[140px] w-auto object-contain"
            priority
          />
        </Link>
        <span className="rounded-full bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 text-[10px] font-bold">
          ADMIN
        </span>
      </div>

      {/* Nav with Active Tab Highlighting */}
      <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-rose-50 text-rose-700 font-bold border-r-4 border-rose-600 shadow-2xs"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <span className={isActive ? "text-rose-600" : "text-zinc-400"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
