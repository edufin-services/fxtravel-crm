"use client";

import { useMemo, useState } from "react";
import type { DrawerLead } from "./LeadDrawer";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export type NoteStatus = {
  hasUserNote: boolean;
  hasFormNote: boolean;
  hasAnyNote: boolean;
  kanbanLabel: string;
  tableLabel: string;
  buttonLabel: string;
};

/**
 * Strips out campaign, adset, ad, assigned routing, form ID, leadgen ID metadata.
 * Retains ONLY real customer form answers (e.g. • question: answer).
 */
export function extractFormAndUserNotes(
  notes?: string | null,
  formNotes?: string | null
): { formNoteText: string; userNoteText: string } {
  const fTrimmed = (formNotes || "").trim();
  const nTrimmed = (notes || "").trim();

  const filterText = (raw: string): { answers: string[]; remarks: string[] } => {
    const answers: string[] = [];
    const remarks: string[] = [];
    if (!raw) return { answers, remarks };

    const lines = raw.split("\n");
    let inFormAnswersBlock = false;

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      const cleanLine = trimmed.replace(/^[•\s*-]+/, "").trim();
      const lowerClean = cleanLine.toLowerCase();

      // Discard all campaign, ad, adset, assigned, form ID, leadgen ID metadata, and inbox url/links
      if (
        trimmed.startsWith("🎯") ||
        trimmed.startsWith("📌") ||
        trimmed.startsWith("📢") ||
        trimmed.startsWith("👤") ||
        trimmed.startsWith("⚠️") ||
        trimmed.startsWith("👉") ||
        trimmed.startsWith("[Google Sheets Ingestion]") ||
        lowerClean.startsWith("campaign:") ||
        lowerClean.startsWith("adset:") ||
        lowerClean.startsWith("ad:") ||
        lowerClean.startsWith("assigned:") ||
        lowerClean.startsWith("form id:") ||
        lowerClean.includes("leadgen id:") ||
        lowerClean.startsWith("meta lead ads") ||
        lowerClean.startsWith("sheet row:") ||
        lowerClean.startsWith("requested service:") ||
        lowerClean.startsWith("inbox url:") ||
        lowerClean.startsWith("inbox_url:") ||
        lowerClean.startsWith("inbox link:") ||
        lowerClean.startsWith("inbox:") ||
        lowerClean.startsWith("inboxurl:") ||
        lowerClean.startsWith("thread url:") ||
        lowerClean.startsWith("thread_url:") ||
        lowerClean.includes("business.facebook.com") ||
        lowerClean.includes("nav_ref=thread_view")
      ) {
        inFormAnswersBlock = false;
        continue;
      }

      if (trimmed.startsWith("📋 Form Answers:") || trimmed.startsWith("Form Answers:")) {
        inFormAnswersBlock = true;
        continue;
      }

      if (trimmed.startsWith("Remarks:")) {
        inFormAnswersBlock = false;
        const text = trimmed.replace(/^Remarks:\s*/i, "").trim();
        if (text) remarks.push(text);
        continue;
      }

      // If bullet line or in answers block
      if (trimmed.startsWith("•") || inFormAnswersBlock) {
        answers.push(trimmed.startsWith("•") ? trimmed : `• ${trimmed}`);
        continue;
      }

      // Check if it's a question: answer line
      if (/^[a-zA-Z0-9_? ]+\s*:\s*.+$/.test(trimmed) && !trimmed.startsWith("Note:")) {
        answers.push(`• ${trimmed}`);
        continue;
      }

      // Otherwise it's human user notes
      inFormAnswersBlock = false;
      remarks.push(rawLine);
    }

    return { answers, remarks };
  };

  const fRes = filterText(fTrimmed);
  const nRes = filterText(nTrimmed);

  const formNoteText = [...fRes.answers, ...nRes.answers].join("\n").trim();
  const userNoteText = [...fRes.remarks, ...nRes.remarks].join("\n").trim();

  return { formNoteText, userNoteText };
}

/**
 * Returns note status for Kanban cards and table rows.
 * Always keeps the previous button labels ("View Note" / "+ Add Note", "Note" / "+ Note").
 */
export function getNoteStatus(notes?: string | null, formNotes?: string | null): NoteStatus {
  const { formNoteText, userNoteText } = extractFormAndUserNotes(notes, formNotes);
  const hasUserNote = Boolean(userNoteText);
  const hasFormNote = Boolean(formNoteText);
  const hasAnyNote = hasUserNote || hasFormNote;

  return {
    hasUserNote,
    hasFormNote,
    hasAnyNote,
    kanbanLabel: hasAnyNote ? "View Note" : "+ Add Note",
    tableLabel: hasAnyNote ? "Note" : "+ Note",
    buttonLabel: hasAnyNote ? "View Note" : "+ Add Note",
  };
}

/**
 * Formats question keys nicely (e.g. "when_are_you_planning_to_travel?" -> "When Are You Planning To Travel?")
 */
function formatQuestionKey(key: string): string {
  return key
    .replace(/^[•\s*-]+/, "")
    .replace(/[?:]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatAnswerVal(val: string): string {
  const trimmed = val.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return trimmed
    .replace(/[_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export default function ViewNoteModal({
  lead,
  onClose,
  onSaveNote,
}: {
  lead: DrawerLead & { formNotes?: string };
  onClose: () => void;
  onSaveNote: (leadId: string, note: string, formNote?: string) => Promise<void>;
}) {
  useBodyScrollLock();

  const { formNoteText, userNoteText } = useMemo(
    () => extractFormAndUserNotes(lead.notes, lead.formNotes),
    [lead.notes, lead.formNotes]
  );

  const [noteText, setNoteText] = useState(userNoteText);
  const [saving, setSaving] = useState(false);

  // Parse structured form answers ONLY (no campaign / adset / ad / assigned / form id)
  const answers = useMemo(() => {
    if (!formNoteText) return [];

    const list: Array<{ q: string; a: string }> = [];
    const lines = formNoteText.split("\n");

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.includes(":")) {
        const clean = line.replace(/^[•\s*-]+/, "").trim();
        const colonIdx = clean.indexOf(":");
        const qRaw = clean.slice(0, colonIdx);
        const aRaw = clean.slice(colonIdx + 1);

        const qNorm = qRaw.toLowerCase().replace(/[\s_-]+/g, "");
        const aLower = aRaw.toLowerCase();

        // Discard any inbox link/url or facebook thread links
        if (
          qNorm.includes("inbox") ||
          qNorm.includes("thread") ||
          aLower.includes("business.facebook.com") ||
          aLower.includes("facebook.com/latest") ||
          aLower.includes("nav_ref=thread_view")
        ) {
          continue;
        }

        const q = formatQuestionKey(qRaw);
        const a = formatAnswerVal(aRaw);
        if (q) {
          list.push({ q, a: a || "—" });
        }
      } else {
        const clean = line.replace(/^[•\s*-]+/, "").trim();
        const cleanLower = clean.toLowerCase();
        if (
          cleanLower.includes("inbox") ||
          cleanLower.includes("business.facebook.com") ||
          cleanLower.includes("thread_view")
        ) {
          continue;
        }
        if (clean) {
          list.push({ q: clean, a: "" });
        }
      }
    }

    return list;
  }, [formNoteText]);

  async function handleSave() {
    setSaving(true);
    await onSaveNote(lead.id, noteText.trim(), formNoteText || undefined);
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overscroll-contain animate-fadeIn"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/90 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-zinc-900 tracking-tight">
                Notes for {lead.name}
              </h2>
              {answers.length > 0 && (
                <span className="rounded-md bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  Form Answers
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Enquiry notes &amp; customer responses</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          className="p-6 space-y-4 overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          {/* ── Compact Customer Form Answers ── */}
          {answers.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-3.5 py-2.5 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 block mb-1.5">
                Customer Form Answers
              </span>
              <div className="divide-y divide-indigo-100/60 text-xs">
                {answers.map((ans, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
                  >
                    <span className="font-semibold text-zinc-600">{ans.q}:</span>
                    <span className="font-extrabold text-zinc-900 text-right">{ans.a || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Enquiry Notes (Agent Editable Note) ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-zinc-700">
                📝 Enquiry Notes &amp; Remarks
              </label>
              <span className="text-[11px] text-zinc-400 font-medium">
                Internal CRM remarks
              </span>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write any note, discussion details, or follow-up remarks for this enquiry..."
              rows={4}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-sm text-zinc-900 font-medium placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all resize-none shadow-2xs"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm shadow-emerald-600/20 disabled:opacity-60 transition-all cursor-pointer"
            >
              {saving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
