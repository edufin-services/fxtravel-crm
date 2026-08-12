"use client";

import { useEffect, useRef, useState } from "react";
import { formatRelativeTime } from "@/lib/format";
import type { Channel } from "@/lib/constants";

type Conversation = {
  id: string;
  name: string;
  company: string;
  channel: Channel;
  preview: string;
  unread: number;
  updatedAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  from: "me" | "them";
  text: string;
  createdAt: string;
};

const channelBadgeStyle: Record<string, { badge: string; icon: string }> = {
  WhatsApp: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", icon: "💬" },
  Instagram: { badge: "bg-pink-50 text-pink-700 border-pink-200/80", icon: "📸" },
  Ads: { badge: "bg-purple-50 text-purple-700 border-purple-200/80", icon: "📢" },
  Email: { badge: "bg-blue-50 text-blue-700 border-blue-200/80", icon: "✉️" },
  "Referral/Others": { badge: "bg-amber-50 text-amber-700 border-amber-200/80", icon: "🤝" },
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
const grad = (name: string) => GRADIENTS[name[0]?.toUpperCase() ?? "A"] ?? "from-emerald-500 to-teal-600";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const QUICK_RESPONSES = [
  "Hi! How can I assist you with FX rates today?",
  "Our current USD card rate is 83.45 with zero margins for students.",
  "Thank you for visiting our office! Sending the rate sheet right over.",
  "Please share your passport copy and student visa to proceed with KYC.",
];

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => {
        const convs: Conversation[] = data.conversations ?? [];
        setConversations(convs);
        if (convs.length > 0) setActiveId(convs[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMessages(true);
    fetch(`/api/conversations/${activeId}/messages`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []))
      .finally(() => setLoadingMessages(false));

    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)));
    fetch(`/api/conversations/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unread: 0 }),
    });
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const active = conversations.find((c) => c.id === activeId);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesChannel = channelFilter === "All" || c.channel === channelFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.preview.toLowerCase().includes(search.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  async function handleSend(e?: React.FormEvent, textOverride?: string) {
    if (e) e.preventDefault();
    const textToSend = textOverride || draft;
    if (!textToSend.trim() || !activeId) return;
    setDraft("");

    const res = await fetch(`/api/conversations/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: textToSend.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessages((prev) => [...prev, data.message]);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, preview: textToSend.trim(), updatedAt: data.message.createdAt, unread: 0 } : c))
      );
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xs">
        <div className="w-80 flex-none border-r border-zinc-100 p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-zinc-200 flex-none" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-zinc-200" />
                <div className="h-2.5 w-full rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 p-6 flex items-center justify-center text-sm text-zinc-400">
          Loading inbox conversations...
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="space-y-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Inbox &amp; Messages</h1>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-200">
                Live Messaging
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 font-medium">
              Omnichannel inbox across WhatsApp, Instagram Direct, Email, and Client Field Visits
            </p>
          </div>
        </div>

        <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200/90 bg-white p-8 text-center shadow-2xs">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h2 className="text-base font-bold text-zinc-900">No conversations yet</h2>
          <p className="mt-1 text-xs text-zinc-400 max-w-sm">
            Incoming messages from your WhatsApp, Instagram, or Email enquiries will automatically appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Inbox &amp; Messages</h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-200">
              Live Messaging
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Omnichannel inbox across WhatsApp, Instagram Direct, and Email
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["All", "WhatsApp", "Instagram", "Email", "Referral/Others"].map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                channelFilter === ch
                  ? "bg-zinc-900 text-white shadow-2xs"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Chat Interface Layout ──────────────────────────────────── */}
      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-xs">
        {/* Left Sidebar Conversations List */}
        <div className="w-80 sm:w-88 flex-none flex flex-col border-r border-zinc-100 bg-zinc-50/30">
          {/* Search Box */}
          <div className="p-3 border-b border-zinc-100 bg-white">
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads, chats..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-1.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* List */}
          <ul className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 italic">
                No active conversations found in {channelFilter}.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeId;
                const badgeInfo = channelBadgeStyle[conv.channel] ?? { badge: "bg-zinc-100 text-zinc-700", icon: "💬" };

                return (
                  <li key={conv.id}>
                    <button
                      onClick={() => setActiveId(conv.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50/60 border-r-4 border-r-emerald-600"
                          : "hover:bg-zinc-100/60"
                      }`}
                    >
                      <div className="relative flex-none">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${grad(conv.name)} text-xs font-black text-white shadow-xs`}>
                          {initials(conv.name)}
                        </div>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className={`truncate text-xs font-bold ${isSelected ? "text-emerald-950" : "text-zinc-900"}`}>
                            {conv.name}
                          </p>
                          <span className="text-[10px] font-medium text-zinc-400 shrink-0">
                            {formatRelativeTime(conv.updatedAt)}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-zinc-500 mt-0.5">{conv.preview}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold border ${badgeInfo.badge}`}>
                            <span>{badgeInfo.icon}</span>
                            {conv.channel}
                          </span>
                          {conv.unread > 0 && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white shadow-2xs">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Right Active Chat View */}
        {active ? (
          <div className="flex flex-1 flex-col min-w-0 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3.5 bg-zinc-50/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${grad(active.name)} text-xs font-black text-white shadow-xs`}>
                    {initials(active.name)}
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-zinc-900">{active.name}</h2>
                    <span className="rounded-md bg-emerald-50 text-emerald-700 px-1.5 py-0.2 text-[9px] font-extrabold border border-emerald-200/60">
                      Active Lead
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">
                    {active.company || "Prospective Client"} · Connected via {active.channel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/dashboard/leads"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 shadow-2xs transition-colors"
                >
                  View Lead Profile →
                </a>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-zinc-50/30">
              {loadingMessages ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"} animate-pulse`}>
                      <div className={`h-10 w-56 rounded-2xl ${i % 2 === 0 ? "bg-zinc-200" : "bg-emerald-200"}`} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <p className="text-xs font-bold text-zinc-700">No messages yet</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Send a response below to start conversation.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-md space-y-1">
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs font-medium shadow-2xs ${
                          msg.from === "me"
                            ? "rounded-br-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                            : "rounded-bl-xs bg-white text-zinc-800 border border-zinc-200/80"
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                      <div className={`flex items-center gap-1 text-[10px] ${msg.from === "me" ? "justify-end text-emerald-700 font-bold" : "text-zinc-400"}`}>
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {msg.from === "me" && <span>✓✓</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Response Templates Chips */}
            <div className="px-6 py-2 border-t border-zinc-100 bg-white flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">Quick Reply:</span>
              {QUICK_RESPONSES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setDraft(tmpl)}
                  className="rounded-lg bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-800 text-zinc-700 px-2.5 py-1 text-[11px] font-semibold transition-colors shrink-0 cursor-pointer border border-zinc-200/60"
                >
                  {tmpl.slice(0, 32)}...
                </button>
              ))}
            </div>

            {/* Input Box */}
            <form onSubmit={handleSend} className="p-4 border-t border-zinc-100 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Reply to ${active.name} on ${active.channel}...`}
                  className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <span>Send</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-zinc-400">
            Select a conversation from the left sidebar to view messages.
          </div>
        )}
      </div>
    </div>
  );
}
