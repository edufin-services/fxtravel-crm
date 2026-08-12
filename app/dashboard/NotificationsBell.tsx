"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";

type NotificationType = "lead" | "visit" | "message" | "task";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
};

const meta: Record<NotificationType, { icon: React.ReactNode; bg: string; badge: string }> = {
  lead: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      </svg>
    ),
    bg: "bg-emerald-100 text-emerald-700",
    badge: "Enquiry",
  },
  visit: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    bg: "bg-teal-100 text-teal-800",
    badge: "Client Visit",
  },
  message: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    bg: "bg-blue-100 text-blue-700",
    badge: "Inbox",
  },
  task: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>
      </svg>
    ),
    bg: "bg-amber-100 text-amber-800",
    badge: "Reminder",
  },
};

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | NotificationType>("all");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 25s for new notifications
    const timer = setInterval(fetchNotifications, 25000);
    return () => clearInterval(timer);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleToggle() {
    setOpen((prev) => !prev);
  }

  async function markAllRead() {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications/read", { method: "POST" });
  }

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  return (
    <div className="relative" ref={ref}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-all border border-transparent hover:border-zinc-200/80 active:scale-95"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Popover */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-2xl border border-zinc-200/90 bg-white shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 bg-zinc-50/60">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-zinc-900">Notifications</h3>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                  {unreadCount} New
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                  Caught up
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition-all"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 border-b border-zinc-100 px-3 py-2 bg-white overflow-x-auto">
            {(
              [
                { id: "all", label: "All" },
                { id: "lead", label: "Leads" },
                { id: "visit", label: "Visits" },
                { id: "message", label: "Chats" },
                { id: "task", label: "Tasks" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filter === t.id
                    ? "bg-zinc-900 text-white shadow-2xs"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                </div>
                <p className="text-xs font-bold text-zinc-800">No notifications in {filter}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">You're all caught up with your CRM updates!</p>
              </div>
            ) : (
              filtered.map((item) => {
                const itemMeta = meta[item.type] ?? meta.lead;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      setOpen(false);
                      if (!item.read) markAllRead();
                    }}
                    className={`flex items-start gap-3 p-3.5 transition-colors ${
                      item.read ? "bg-white hover:bg-zinc-50/70" : "bg-emerald-50/20 hover:bg-emerald-50/40"
                    }`}
                  >
                    <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-xl shadow-2xs ${itemMeta.bg}`}>
                      {itemMeta.icon}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-zinc-900">{item.title}</p>
                        <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-zinc-500 mt-0.5">{item.message}</p>
                    </div>

                    {!item.read && (
                      <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-emerald-600" title="Unread" />
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer Link */}
          <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-2.5 text-center">
            <Link
              href="/dashboard/leads"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
            >
              <span>View CRM Activity Stream</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
