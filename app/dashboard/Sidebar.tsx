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
      className={`sticky top-0 h-screen max-h-screen hidden flex-col bg-white border-r border-zinc-200/80 pt-3 pb-3 transition-all duration-200 ease-in-out lg:flex z-30 shrink-0 select-none overflow-y-auto ${
        collapsed ? "w-[60px] px-1.5" : "w-[170px] px-2"
      }`}
    >
      {/* Top Header: Logo only matching reference CRM */}
      <div className="flex items-center justify-center px-1 mb-2">
        {collapsed ? (
          <Logo compact />
        ) : (
          <div className="flex items-center justify-center w-full py-1">
            <Logo />
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} collapsed={collapsed}>
            {item.label}
          </NavLink>
        ))}
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
