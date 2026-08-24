"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function NavLink({
  href,
  icon,
  children,
  collapsed = false,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  const labelText = typeof children === "string" ? children : undefined;

  return (
    <Link
      href={href}
      title={collapsed ? labelText : undefined}
      className={`group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 ${
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3.5 py-2.5"
      } ${
        isActive
          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs"
          : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
      }`}
    >
      <span className={`flex-none transition-colors duration-150 ${isActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-700"}`}>
        {icon}
      </span>
      {!collapsed && <span className="truncate flex-1">{children}</span>}
      {isActive && (
        <span className={`absolute ${collapsed ? "left-1 top-2 bottom-2 w-1" : "left-0 top-2 bottom-2 w-1"} rounded-r-full bg-emerald-600`} />
      )}
    </Link>
  );
}
