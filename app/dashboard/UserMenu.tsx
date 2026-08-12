"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function UserMenu({
  name,
  company,
  profileHref = "/dashboard/profile",
}: {
  name: string;
  company?: string;
  profileHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-full p-1.5 hover:bg-zinc-100/80 transition-all border border-transparent hover:border-zinc-200/80 group"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-black text-white shadow-xs group-hover:scale-105 transition-transform ring-2 ring-emerald-500/20">
          {initials(name)}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-xs font-extrabold text-zinc-900 leading-tight">{name}</p>
          {company && <p className="text-[11px] font-semibold text-emerald-700 leading-tight">{company}</p>}
        </div>
        <div className="hidden sm:block text-zinc-400 group-hover:text-zinc-600 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95">
          {/* User Info Header inside menu */}
          <div className="px-3 py-2.5 border-b border-zinc-100 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-black text-white shadow-xs">
                {initials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-zinc-900">{name}</p>
                <p className="truncate text-[11px] font-medium text-zinc-500">{company}</p>
                <span className="inline-block mt-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.2 text-[9px] font-extrabold">
                  Verified User
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              My Profile &amp; Settings
            </Link>
          </div>

          <div className="pt-1 mt-1 border-t border-zinc-100">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </span>
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
