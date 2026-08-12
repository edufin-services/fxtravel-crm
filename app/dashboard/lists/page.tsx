"use client";

import { useEffect, useMemo, useState } from "react";
import { CHANNELS, type Channel } from "@/lib/constants";

type Contact = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  channel: Channel;
  tags: string[];
  createdAt: string;
};

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

const CHANNEL_STYLE: Record<string, { badge: string; dot: string }> = {
  WhatsApp: { badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  Instagram: { badge: "bg-pink-50 text-pink-700 ring-1 ring-pink-200", dot: "bg-pink-500" },
  TikTok: { badge: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200", dot: "bg-zinc-500" },
  Email: { badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200", dot: "bg-blue-500" },
  "Referral/Others": { badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: "bg-amber-500" },
};

function ChannelBadge({ channel }: { channel: string }) {
  const s = CHANNEL_STYLE[channel];
  if (!s) return <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">{channel}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-none ${s.dot}`} />
      {channel}
    </span>
  );
}

type ViewMode = "table" | "grid";

export default function ListsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => setContacts(data.contacts ?? []))
      .finally(() => setLoading(false));
  }, []);

  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = { All: contacts.length };
    for (const c of contacts) {
      counts[c.channel] = (counts[c.channel] ?? 0) + 1;
    }
    return counts;
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      const matchesChannel = channelFilter === "All" || c.channel === channelFilter;
      if (!matchesChannel) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    });
  }, [contacts, search, channelFilter]);

  async function handleSave(data: { name: string; company: string; email: string; phone: string }) {
    if (editing) {
      const res = await fetch(`/api/contacts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (res.ok) {
        setContacts((prev) => prev.map((c) => (c.id === editing.id ? body.contact : c)));
        setShowModal(false);
        setEditing(null);
      }
      return body;
    } else {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, channel: CHANNELS[0], tags: [] }),
      });
      const body = await res.json();
      if (res.ok) {
        setContacts((prev) => [...prev, body.contact]);
        setShowModal(false);
      }
      return body;
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setContacts((prev) => prev.filter((c) => c.id !== deleteId));
    await fetch(`/api/contacts/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
  }

  const allChannels = ["All", ...Array.from(new Set(contacts.map((c) => c.channel).filter(Boolean)))];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Contacts</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {loading ? "Loading..." : `${contacts.length} total contact${contacts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
          Add contact
        </button>
      </div>

      {/* Stats strip */}
      {!loading && contacts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: contacts.length, bg: "bg-zinc-900", text: "text-white" },
            { label: "WhatsApp", value: channelCounts["WhatsApp"] ?? 0, bg: "bg-emerald-500", text: "text-white" },
            { label: "Instagram", value: channelCounts["Instagram"] ?? 0, bg: "bg-pink-500", text: "text-white" },
            { label: "Email", value: channelCounts["Email"] ?? 0, bg: "bg-blue-500", text: "text-white" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-sm">
              <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${s.bg}`}>
                <span className={`text-sm font-bold ${s.text}`}>{s.value}</span>
              </div>
              <span className="text-sm font-medium text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-sm min-w-[200px] flex-1 max-w-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 flex-none">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-600 flex-none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>

        {/* Channel filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {allChannels.map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                channelFilter === ch
                  ? "bg-zinc-900 text-white"
                  : "bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
              }`}
            >
              {ch}
              {channelCounts[ch] !== undefined && (
                <span className={`ml-1.5 ${channelFilter === ch ? "text-zinc-300" : "text-zinc-400"}`}>
                  {channelCounts[ch]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-0.5 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setViewMode("table")}
            className={`rounded-lg p-2 transition-colors ${viewMode === "table" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-600"}`}
            title="Table view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
            </svg>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-lg p-2 transition-colors ${viewMode === "grid" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-600"}`}
            title="Grid view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/>
              <rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full">
            <tbody className="divide-y divide-zinc-50">
              {[...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-200 flex-none" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 rounded bg-zinc-200" />
                        <div className="h-2.5 w-20 rounded bg-zinc-100" />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><div className="h-3 w-32 rounded bg-zinc-100" /></td>
                  <td className="px-5 py-4"><div className="h-3 w-24 rounded bg-zinc-100" /></td>
                  <td className="px-5 py-4"><div className="h-5 w-20 rounded-full bg-zinc-100" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          {search || channelFilter !== "All" ? (
            <>
              <p className="text-sm font-semibold text-zinc-700">No contacts found</p>
              <p className="mt-1 text-xs text-zinc-400">Try adjusting your search or filter</p>
              <button
                onClick={() => { setSearch(""); setChannelFilter("All"); }}
                className="mt-4 rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-zinc-700">No contacts yet</p>
              <p className="mt-1 text-xs text-zinc-400">Add your first contact to get started</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm transition-colors"
              >
                + Add contact
              </button>
            </>
          )}
        </div>

      ) : viewMode === "table" ? (
        /* Table view */
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Contact</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Email</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Phone</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Channel</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Tags</th>
                  <th className="px-5 py-3 w-32" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="group hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br ${grad(contact.name)} text-[11px] font-bold text-white shadow-sm`}>
                          {initials(contact.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 leading-tight">{contact.name}</p>
                          {contact.company && <p className="text-xs text-zinc-400 mt-0.5">{contact.company}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-zinc-500 hover:text-brand-600 transition-colors text-sm">{contact.email}</a>
                      ) : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {contact.phone ? (
                        <a href={`tel:${contact.phone}`} className="text-zinc-500 hover:text-brand-600 transition-colors text-sm">{contact.phone}</a>
                      ) : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {contact.channel ? <ChannelBadge channel={contact.channel} /> : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {contact.tags?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">{tag}</span>
                          ))}
                          {contact.tags.length > 3 && <span className="text-[10px] text-zinc-400 self-center">+{contact.tags.length - 3}</span>}
                        </div>
                      ) : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditing(contact); setShowModal(true); }}
                          className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(contact.id)}
                          className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-red-200 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-zinc-50 px-5 py-2.5 text-xs text-zinc-400">
              Showing {filtered.length} of {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

      ) : (
        /* Grid / Card view */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((contact) => (
            <div key={contact.id} className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              {/* Top: avatar + name + actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br ${grad(contact.name)} text-sm font-bold text-white shadow-sm`}>
                    {initials(contact.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 leading-tight">{contact.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{contact.company || "—"}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-none">
                  <button
                    onClick={() => { setEditing(contact); setShowModal(true); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
                    title="Edit"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteId(contact.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:border-red-200 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contact details */}
              <div className="space-y-2">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-brand-600 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-none text-zinc-300">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span className="truncate">{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-brand-600 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-none text-zinc-300">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    <span>{contact.phone}</span>
                  </a>
                )}
              </div>

              {/* Footer: channel + tags */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-50">
                {contact.channel ? <ChannelBadge channel={contact.channel} /> : <span />}
                {contact.tags?.length > 0 && (
                  <div className="flex gap-1">
                    {contact.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">{tag}</span>
                    ))}
                    {contact.tags.length > 2 && <span className="text-[10px] text-zinc-400 self-center">+{contact.tags.length - 2}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <ContactModal
          contact={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={handleSave}
        />
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-zinc-900">Delete contact?</h2>
            <p className="mt-1.5 text-sm text-zinc-500">This will permanently remove the contact and cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactModal({
  contact,
  onClose,
  onSubmit,
}: {
  contact: Contact | null;
  onClose: () => void;
  onSubmit: (data: { name: string; company: string; email: string; phone: string }) => Promise<{ error?: string }>;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const result = await onSubmit({ name, company, email, phone });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  const inputCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors";
  const labelCls = "mb-1.5 block text-xs font-semibold text-zinc-500 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Modal header with live avatar preview */}
        <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-4">
          {name.trim() ? (
            <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br ${grad(name)} text-xs font-bold text-white shadow-sm`}>
              {initials(name)}
            </div>
          ) : (
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-zinc-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-sm font-bold text-zinc-900">{contact ? "Edit contact" : "New contact"}</h2>
            <p className="text-xs text-zinc-400">{contact ? "Update contact details" : "Fill in the details below"}</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Company *</label>
              <input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone *</label>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" className={inputCls} />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm transition-colors">
              {saving ? "Saving..." : contact ? "Save changes" : "Add contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
