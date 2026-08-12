"use client";

import { useState } from "react";
import { RobotIcon } from "../icons";

const SAMPLE_CONVERSATION = [
  { from: "them", text: "Hi, what are your pricing plans?" },
  { from: "agent", text: "Hi! We have three plans — Starter, Growth, and Pro. Would you like a quick breakdown of each?" },
  { from: "them", text: "Yes please, and is there a free trial?" },
  { from: "agent", text: "Yes, every plan includes a 14-day free trial, no card required. I can send you a comparison sheet — want me to do that?" },
];

export default function AiAgentPage() {
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState("Fxpertise Assistant");
  const [persona, setPersona] = useState(
    "You are a friendly sales assistant for our company. Answer questions about pricing, features, and availability. Hand off to a human for anything related to refunds or contracts."
  );
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">AI Agent</h1>
          <p className="mt-0.5 text-sm text-zinc-400">Configure an AI assistant to handle first replies across your inbox.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <span className={`text-sm font-semibold ${enabled ? "text-brand-600" : "text-zinc-400"}`}>
            {enabled ? "Active" : "Inactive"}
          </span>
          <span className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-zinc-200 transition-colors peer-checked:bg-brand-600" />
            <span className="absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      {enabled && (
        <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
          <p className="text-sm font-semibold text-brand-700">Agent is active — auto-replying to new conversations</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Settings */}
        <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 1 21 12a10 10 0 0 1-10 10A10 10 0 0 1 2 12a10 10 0 0 1 1.93-5.07"/>
              </svg>
            </div>
            <h2 className="text-sm font-bold text-zinc-900">Agent settings</h2>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 uppercase tracking-wide">Agent name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 uppercase tracking-wide">Instructions</label>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors resize-none"
            />
            <p className="mt-1.5 text-xs text-zinc-400">
              Describe how the agent should respond. It will reply automatically to new conversations across connected channels.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
            >
              Save settings
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <RobotIcon />
            </span>
            <div>
              <p className="text-sm font-bold text-zinc-900">{name}</p>
              <p className="text-xs text-zinc-400">Preview conversation</p>
            </div>
            <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${enabled ? "bg-brand-50 text-brand-700" : "bg-zinc-100 text-zinc-500"}`}>
              {enabled ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="flex-1 space-y-3 p-5 bg-zinc-50/30">
            {SAMPLE_CONVERSATION.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "agent" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-sm rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.from === "agent"
                      ? "rounded-br-md bg-brand-600 text-white"
                      : "rounded-bl-md bg-white text-zinc-800 border border-zinc-100"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-100 bg-white px-5 py-4">
            <p className="text-xs text-zinc-400">
              This is a sample preview. {enabled ? "The agent is now auto-replying to real conversations." : "Turn the agent on to start auto-replying."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
