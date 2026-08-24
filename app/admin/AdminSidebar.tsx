"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import FxLogoIcon from "../components/FxLogoIcon";

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
    href: "/admin/integrations",
    label: "Integrations & APIs",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 11a9 9 0 0 1 9 9" />
        <path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1" />
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_collapsed", String(next));
      return next;
    });
  }

  return (
    <aside
      className={`hidden flex-col bg-white border-r border-zinc-200/80 py-5 transition-all duration-300 ease-in-out lg:flex shadow-xs z-20 shrink-0 ${
        collapsed ? "w-[72px] px-2.5" : "w-60 px-3.5"
      }`}
    >
      {/* Logo area */}
      <div className={`flex items-center ${collapsed ? "flex-col gap-3 justify-center px-0" : "justify-between px-2"}`}>
        {collapsed ? (
          <Link href="/admin/dashboard" className="flex items-center justify-center" title="Fxpertise Admin">
            <Image
              src="/fx-icon1.png"
              alt="Fxpertise Admin"
              width={36}
              height={36}
              className="h-9 w-9 object-contain rounded-xl shadow-xs"
              priority
            />
          </Link>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
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
            <span className="rounded-full bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 text-[10px] font-bold shrink-0">
              ADMIN
            </span>
          </div>
        )}

        {/* Minimize / Maximize Button */}
        <button
          onClick={toggleCollapse}
          title={collapsed ? "Maximize sidebar" : "Minimize sidebar"}
          aria-label={collapsed ? "Maximize sidebar" : "Minimize sidebar"}
          className={`flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-all border border-zinc-200/70 shadow-2xs ${
            collapsed ? "h-8 w-8" : "h-7 w-7"
          }`}
        >
          {collapsed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Nav with Active Tab Highlighting */}
      <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-0.5">
        {NAV.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-xl text-sm font-medium transition-all ${
                collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
              } ${
                isActive
                  ? `bg-rose-50 text-rose-700 font-bold ${collapsed ? "ring-2 ring-rose-500/30" : "border-r-4 border-rose-600"} shadow-2xs`
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <span className={`flex-none ${isActive ? "text-rose-600" : "text-zinc-400"}`}>{item.icon}</span>
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer minimize toggle */}
      <div className="mt-auto pt-3 border-t border-zinc-100">
        <button
          onClick={toggleCollapse}
          className={`w-full flex items-center rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100/80 transition-all py-2 ${
            collapsed ? "justify-center px-1" : "gap-2.5 px-3"
          }`}
          title={collapsed ? "Maximize sidebar" : "Minimize sidebar"}
        >
          <span className="flex h-5 w-5 items-center justify-center text-zinc-400">
            {collapsed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <path d="M13 10l3 2-3 2" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <path d="M16 14l-3-2 3-2" />
              </svg>
            )}
          </span>
          {!collapsed && (
            <span className="text-[11px] font-medium text-zinc-500 truncate">Minimize Sidebar</span>
          )}
        </button>
      </div>
    </aside>
  );
}
