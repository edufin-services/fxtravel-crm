"use client";

import { useEffect, useState } from "react";
import Logo from "../components/Logo";
import NavLink from "./NavLink";
import {
  GridIcon,
  ChatIcon,
  FunnelIcon,
  ChartIcon,
  CalendarIcon,
  ListIcon,
  MailIcon,
  TrashIcon,
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

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("crm_sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("crm_sidebar_collapsed", String(next));
      return next;
    });
  }

  return (
    <aside
      className={`hidden flex-col bg-white border-r border-zinc-200/80 py-5 transition-all duration-300 ease-in-out lg:flex shadow-xs z-20 shrink-0 ${
        collapsed ? "w-[72px] px-2.5" : "w-60 px-3.5"
      }`}
    >
      {/* Top Header area with Logo + Collapse/Expand Toggle */}
      <div className={`flex items-center ${collapsed ? "flex-col gap-3 justify-center px-0" : "justify-between px-2"}`}>
        {collapsed ? (
          <Logo compact />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Logo />
            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold shrink-0">
              PRO
            </span>
          </div>
        )}

        {/* Maximize / Minimize Toggle Button */}
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

      {/* Nav List */}
      <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} collapsed={collapsed}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer minimize/maximize toggle helper */}
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
