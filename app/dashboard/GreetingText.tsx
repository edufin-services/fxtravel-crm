"use client";

import { useEffect, useState } from "react";

function calculateGreeting(): string {
  let hour: number;
  try {
    const tz = typeof window !== "undefined"
      ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata")
      : "Asia/Kolkata";
    const hourStr = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: tz,
    }).format(new Date());
    hour = parseInt(hourStr, 10);
  } catch {
    hour = new Date().getHours();
  }

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  try {
    const tz = typeof window !== "undefined"
      ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata")
      : "Asia/Kolkata";
    return new Date().toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: tz,
    });
  } catch {
    return new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
}

export function GreetingTitle({ name }: { name: string }) {
  const [greeting, setGreeting] = useState(calculateGreeting);

  useEffect(() => {
    setGreeting(calculateGreeting());
  }, []);

  return (
    <h1 className="text-2xl font-black text-zinc-900 tracking-tight sm:text-3xl">
      {greeting}, {name}
    </h1>
  );
}

export function HeaderDate() {
  const [dateStr, setDateStr] = useState(formatDate);

  useEffect(() => {
    setDateStr(formatDate());
  }, []);

  return <span>{dateStr}</span>;
}
