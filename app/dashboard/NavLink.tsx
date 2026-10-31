"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

function NavLinkInner({
  icon,
  children,
  collapsed,
  isActive,
}: {
  icon: ReactNode;
  children: ReactNode;
  collapsed: boolean;
  isActive: boolean;
}) {
  const { pending } = useLinkStatus();
  const active = isActive || pending;

  return (
    <>
      {/* Signature left pill indicator matching reference CRM */}
      {active && (
        <span
          className={`absolute ${
            collapsed ? "left-0.5" : "left-0"
          } top-1/2 -translate-y-1/2 w-1 h-4.5 rounded-r-full bg-[#059669] transition-all duration-150`}
        />
      )}
      <span
        className={`flex items-center justify-center shrink-0 transition-colors duration-150 [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:stroke-[1.8] ${
          active ? "text-[#059669]" : "text-zinc-400 group-hover:text-zinc-600"
        } ${pending ? "animate-pulse" : ""}`}
      >
        {icon}
      </span>
      {!collapsed && <span className="truncate flex-1 tracking-tight">{children}</span>}
      {!collapsed && pending && (
        <span className="shrink-0 flex items-center justify-center text-[#059669] animate-spin ml-auto">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </span>
      )}
    </>
  );
}

export default function NavLink({
  href,
  icon,
  children,
  collapsed = false,
  isActive: explicitIsActive,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const labelText = typeof children === "string" ? children : undefined;

  const isActive =
    explicitIsActive !== undefined
      ? explicitIsActive
      : href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?");

  // Proactively warm route cache on hover or touch
  const handleWarm = () => {
    try {
      router.prefetch(href);
    } catch {}
  };

  return (
    <Link
      href={href}
      prefetch={true}
      title={collapsed ? labelText : undefined}
      onMouseEnter={handleWarm}
      onPointerEnter={handleWarm}
      onTouchStart={handleWarm}
      onClick={onClick}
      className={`group relative flex items-center rounded-xl text-[12px] font-medium transition-all duration-150 ${
        collapsed ? "justify-center px-1.5 py-1.5" : "gap-2 px-2.5 py-1.5"
      } ${
        isActive
          ? "bg-[#ecfdf5] text-[#065f46] font-bold border border-[#a7f3d0]/60 shadow-2xs"
          : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900"
      }`}
    >
      <NavLinkInner
        icon={icon}
        collapsed={collapsed}
        isActive={isActive}
      >
        {children}
      </NavLinkInner>
    </Link>
  );
}
