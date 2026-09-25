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
    href: "/admin/client-visits",
    label: "Client Visits",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/branches",
    label: "Branches",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" strokeLinecap="round"/>
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
    href: "/admin/stats",
    label: "Stats",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" strokeLinejoin="round" />
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
      className={`sticky top-0 h-screen max-h-screen hidden flex-col bg-white border-r border-zinc-200/80 pt-3 pb-3 transition-all duration-200 ease-in-out lg:flex z-30 shrink-0 select-none overflow-y-auto ${
        collapsed ? "w-[60px] px-1.5" : "w-[170px] px-2"
      }`}
    >
      {/* Logo area */}
      <div className="flex items-center justify-center px-1 mb-2">
        {collapsed ? (
          <Link href="/admin/dashboard" className="flex items-center justify-center" title="Fxpertise Admin">
            <Image
              src="/fx-icon1.png"
              alt="Fxpertise Admin"
              width={32}
              height={32}
              className="h-8 w-8 object-contain rounded-xl shadow-xs"
              priority
            />
          </Link>
        ) : (
          <div className="flex items-center justify-center gap-1.5 w-full py-1">
            <Link href="/admin/dashboard" className="flex items-center gap-1.5">
              <Image
                src="/logo.png"
                alt="Fxpertise Travel & Forex"
                width={130}
                height={56}
                className="h-8 max-w-[115px] w-auto object-contain"
                priority
              />
            </Link>
            <span className="rounded-full bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 text-[9px] font-extrabold shrink-0">
              ADMIN
            </span>
          </div>
        )}
      </div>

      {/* Nav with Active Tab Highlighting */}
      <nav className="mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
        {NAV.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center rounded-xl text-[12px] font-medium transition-all duration-150 ${
                collapsed ? "justify-center px-1.5 py-1.5" : "gap-2 px-2.5 py-1.5"
              } ${
                isActive
                  ? "bg-rose-50 text-rose-800 font-bold border border-rose-200/70 shadow-2xs"
                  : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900"
              }`}
            >
              {isActive && (
                <span
                  className={`absolute ${
                    collapsed ? "left-0.5" : "left-0"
                  } top-1/2 -translate-y-1/2 w-1 h-4.5 rounded-r-full bg-rose-600`}
                />
              )}
              <span className={`flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:stroke-[1.8] ${isActive ? "text-rose-600" : "text-zinc-400 group-hover:text-zinc-600"}`}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate flex-1 tracking-tight">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Minimize / Expand Toggle matching reference CRM */}
      <div className="mt-auto pt-2.5 border-t border-zinc-100">
        <button
          onClick={toggleCollapse}
          className={`w-full flex items-center rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-all py-1.5 ${
            collapsed ? "justify-center px-1" : "gap-2 px-2.5"
          }`}
          title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
        >
          {collapsed ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[12px] font-semibold text-zinc-400">Minimize</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
