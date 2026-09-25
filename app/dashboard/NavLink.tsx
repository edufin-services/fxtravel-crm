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
      className={`group relative flex items-center rounded-xl text-[12px] font-medium transition-all duration-150 ${
        collapsed ? "justify-center px-1.5 py-1.5" : "gap-2 px-2.5 py-1.5"
      } ${
        isActive
          ? "bg-[#ecfdf5] text-[#065f46] font-bold border border-[#a7f3d0]/60 shadow-2xs"
          : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900"
      }`}
    >
      {/* Signature left pill indicator matching reference CRM */}
      {isActive && (
        <span
          className={`absolute ${
            collapsed ? "left-0.5" : "left-0"
          } top-1/2 -translate-y-1/2 w-1 h-4.5 rounded-r-full bg-[#059669]`}
        />
      )}
      <span
        className={`flex items-center justify-center shrink-0 transition-colors duration-150 [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:stroke-[1.8] ${
          isActive ? "text-[#059669]" : "text-zinc-400 group-hover:text-zinc-600"
        }`}
      >
        {icon}
      </span>
      {!collapsed && <span className="truncate flex-1 tracking-tight">{children}</span>}
    </Link>
  );
}

