"use client";

import { useRouter } from "next/navigation";

export default function AdminLogout() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Sign out
    </button>
  );
}
