"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${
        isActive
          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs"
          : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
      }`}
    >
      <span className={`transition-colors duration-150 ${isActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-700"}`}>
        {icon}
      </span>
      <span>{children}</span>
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-600" />
      )}
    </Link>
  );
}
