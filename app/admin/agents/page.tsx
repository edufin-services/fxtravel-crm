"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Agent = { id: string; name: string; email: string; company: string; createdAt: string };

const GRADIENTS: Record<string, string> = {
  A:"from-rose-400 to-rose-600",B:"from-pink-400 to-pink-600",C:"from-fuchsia-400 to-fuchsia-600",
  D:"from-violet-400 to-violet-600",E:"from-indigo-400 to-indigo-600",F:"from-blue-400 to-blue-600",
  G:"from-sky-400 to-sky-600",H:"from-cyan-400 to-cyan-600",I:"from-teal-400 to-teal-600",
  J:"from-emerald-400 to-emerald-600",K:"from-green-400 to-green-600",L:"from-lime-400 to-lime-600",
  M:"from-amber-400 to-amber-600",N:"from-orange-400 to-orange-600",O:"from-red-400 to-red-600",
  P:"from-rose-400 to-rose-600",Q:"from-purple-400 to-purple-600",R:"from-blue-400 to-blue-600",
  S:"from-sky-400 to-sky-600",T:"from-teal-400 to-teal-600",U:"from-cyan-400 to-cyan-600",
  V:"from-violet-400 to-violet-600",W:"from-fuchsia-400 to-fuchsia-600",X:"from-indigo-400 to-indigo-600",
  Y:"from-amber-400 to-amber-600",Z:"from-orange-400 to-orange-600",
};
const grad = (name: string) => GRADIENTS[name[0]?.toUpperCase() ?? "A"] ?? "from-zinc-400 to-zinc-600";
const initials = (name: string) => name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/agents")
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filteredAgents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.company.toLowerCase().includes(q)
    );
  }, [agents, query]);

  async function handleCreate(data: { name: string; company: string; email: string; password: string }) {
    const res = await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok) {
      setAgents((prev) => [...prev, body.agent]);
      setShowModal(false);
    }
    return body;
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setAgents((prev) => prev.filter((a) => a.id !== deleteId));
    await fetch(`/api/admin/agents/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleteName("");
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Users</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {loading ? "Loading..." : `${agents.length} registered user account${agents.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
          Create User
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-xs max-w-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 flex-none">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
        />
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white overflow-hidden shadow-xs">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1.5fr_1fr_140px] gap-4 px-5 py-3 bg-zinc-50/80 border-b border-zinc-100 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          <span>User</span>
          <span>Company</span>
          <span>Joined</span>
          <span></span>
        </div>

        {/* Skeleton rows */}
        {loading && [...Array(4)].map((_, i) => (
          <div key={i} className="grid grid-cols-[2fr_1.5fr_1fr_140px] gap-4 px-5 py-4 border-b border-zinc-50 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-zinc-200 flex-none" />
              <div className="space-y-1.5">
                <div className="h-3 w-24 rounded bg-zinc-200" />
                <div className="h-2.5 w-32 rounded bg-zinc-100" />
              </div>
            </div>
            <div className="h-3 w-20 rounded bg-zinc-100 self-center" />
            <div className="h-3 w-16 rounded bg-zinc-100 self-center" />
            <div />
          </div>
        ))}

        {/* Empty state */}
        {!loading && filteredAgents.length === 0 && (
          <div className="flex flex-col items-center py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-600">
              {agents.length === 0 ? "No branches yet" : "No branches match your search"}
            </p>
            {agents.length === 0 && (
              <button onClick={() => setShowModal(true)} className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                + Create first branch
              </button>
            )}
          </div>
        )}

        {/* Data rows */}
        {!loading && filteredAgents.map((agent, idx) => (
          <div
            key={agent.id}
            className="grid grid-cols-[2fr_1.5fr_1fr_140px] gap-4 px-5 py-3.5 items-center hover:bg-zinc-50/60 transition-colors group"
            style={{ borderBottom: idx < filteredAgents.length - 1 ? "1px solid #f4f4f5" : "none" }}
          >
            <Link href={`/admin/agents/${agent.id}`} className="flex items-center gap-3">
              <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br ${grad(agent.name)} text-[10px] font-bold text-white shadow-sm`}>
                {initials(agent.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 group-hover:text-emerald-600 transition-colors leading-tight">{agent.name}</p>
                <p className="text-xs text-zinc-400">{agent.email}</p>
              </div>
            </Link>
            <p className="text-sm text-zinc-500">{agent.company || "—"}</p>
            <p className="text-xs text-zinc-400">
              {new Date(agent.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/agents/${agent.id}`}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                View
              </Link>
              <button
                onClick={() => { setDeleteId(agent.id); setDeleteName(agent.name); }}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Footer */}
        {!loading && filteredAgents.length > 0 && (
          <div className="border-t border-zinc-50 px-5 py-2.5 text-xs text-zinc-400">
            {filteredAgents.length} branch{filteredAgents.length !== 1 ? "es" : ""} total
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <CreateAgentModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => { setDeleteId(null); setDeleteName(""); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200/80" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 border border-red-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-zinc-900">Delete {deleteName}?</h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              This permanently deletes the branch account. Their leads will remain in the system.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setDeleteId(null); setDeleteName(""); }}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors shadow-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateAgentModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; company: string; email: string; password: string }) => Promise<{ error?: string }>;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const result = await onCreate({ name, company, email, password });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  const inputCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200/80 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Create User</h2>
            <p className="text-xs text-zinc-400 mt-0.5">User can log in immediately after creation</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Full Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className={inputCls} />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Company *</label>
              <input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email Address *</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" className={inputCls} />
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Password *</label>
            <div className="relative">
              <input
                required minLength={8}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className={`${inputCls} pr-10`}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-600">
                {showPassword ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-2.5 text-sm font-bold text-white hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 shadow-sm shadow-emerald-600/20 transition-all">
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
