"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AdminSearchResult } from "@/app/api/admin/search/route";

const badgeStyle: Record<AdminSearchResult["type"], string> = {
  agent: "bg-violet-50 text-violet-700 border-violet-200",
  lead: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trash: "bg-rose-50 text-rose-700 border-rose-200",
};

const badgeLabel: Record<AdminSearchResult["type"], string> = {
  agent: "User",
  lead: "Lead",
  trash: "Trash Lead",
};

export default function AdminSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative flex-1 max-w-md" ref={ref}>
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-zinc-400 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition-all shadow-xs">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="flex-none">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search users, leads, trash..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          className="w-full bg-transparent text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="flex-none text-zinc-400 hover:text-zinc-600 text-xs font-semibold"
          >
            ✕
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-zinc-200/90 bg-white shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-zinc-400">
              <div className="h-3 w-3 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              Searching users, leads & trash...
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-zinc-400">No matching users, leads, or trash found.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-zinc-50 py-1">
              {results.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.href}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-zinc-900">{r.title}</p>
                    <p className="truncate text-[11px] text-zinc-500 mt-0.5">{r.subtitle}</p>
                  </div>
                  <span className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeStyle[r.type]}`}>
                    {badgeLabel[r.type]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
