"use client";

import { useEffect, useRef, useState } from "react";
import { SERVICES, STAGES, type Channel, type Stage } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import SetReminderModal from "./SetReminderModal";

export type LeadDocument = { name: string; url: string; uploadedAt: string };

export type DrawerLead = {
  id: string;
  name: string;
  channel: Channel;
  stage: Stage;
  createdAt: string;
  whatsappId?: string;
  email?: string;
  phone?: string;
  color?: string;
  notes?: string;
  services?: string[];
  serviceType?: string;
  sourceCurrency?: string;
  targetCurrency?: string;
  sourceAmount?: number;
  targetAmount?: number;
  panNumber?: string;
  passportNumber?: string;
  lrsPurpose?: string;
  city?: string;
  state?: string;
  neetStatus?: string;
  preferredCountry?: string;
  preferredUniversity1?: string;
  preferredUniversity2?: string;
  assignAgent?: string;
  firstPayment?: number;
  secondPayment?: number;
  thirdPaymentAmount?: number;
  otcAmount?: number;
  totalServiceCharge?: number;
  documents?: LeadDocument[];
  proposalDoc?: LeadDocument | null;
  registrationDoc?: LeadDocument | null;
  admissionLetter?: LeadDocument | null;
  invoices?: LeadDocument[];
  otcInvoices?: LeadDocument[];
  invitationLetter?: LeadDocument | null;
  thirdPaymentInvoices?: LeadDocument[];
  visaDocuments?: LeadDocument[];
  reminderAt?: string;
  // Client Visit Scope
  companyName?: string;
  designation?: string;
  yearlyVolume?: number;
  rateOfferedCN?: number;
  rateOfferedCard?: number;
  rateOfferedTTDD?: number;
  nextFollowUp?: string;
  feedback?: string;
  clientVisitStatus?: string;
};

type LeadUpdate = {
  name: string; stage: Stage;
  email: string; phone: string; color: string; notes: string;
  services?: string[];
  city: string; state: string; neetStatus: string;
  preferredCountry: string; preferredUniversity1: string; preferredUniversity2: string;
  assignAgent: string;
  ownerId: string;
  firstPayment: number; secondPayment: number; thirdPaymentAmount: number;
  otcAmount: number; totalServiceCharge: number;
  companyName?: string; designation?: string; yearlyVolume?: number;
  rateOfferedCN?: number; rateOfferedCard?: number; rateOfferedTTDD?: number;
  nextFollowUp?: string; feedback?: string; clientVisitStatus?: string;
};

const LEAD_COLORS = [
  { value: "",        label: "Default", bg: "bg-white",         border: "border-zinc-200",    dot: "bg-zinc-400" },
  { value: "sky",     label: "Sky",     bg: "bg-sky-100/90",     border: "border-sky-400",     dot: "bg-sky-600" },
  { value: "emerald", label: "Green",   bg: "bg-emerald-100/90", border: "border-emerald-400", dot: "bg-emerald-600" },
  { value: "amber",   label: "Amber",   bg: "bg-amber-100/90",   border: "border-amber-400",   dot: "bg-amber-600" },
  { value: "violet",  label: "Violet",  bg: "bg-violet-100/90",  border: "border-violet-400",  dot: "bg-violet-600" },
  { value: "rose",    label: "Rose",    bg: "bg-rose-100/90",    border: "border-rose-400",    dot: "bg-rose-600" },
  { value: "orange",  label: "Orange",  bg: "bg-orange-100/90",  border: "border-orange-400",  dot: "bg-orange-600" },
];

const NEET_STATUS_OPTIONS = ["", "Appeared", "Passed", "Pending", "Not Applicable"];
const COUNTRY_OPTIONS = ["Russia", "Kazakhstan", "Kyrgyzstan", "Georgia", "Philippines", "Bangladesh", "Nepal", "China", "Ukraine", "Other"];

const stageColor: Record<string, string> = {
  Initial: "bg-blue-500", Connected: "bg-amber-500", Confirmed: "bg-emerald-500", Closed: "bg-red-500",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const avatarGradient: Record<string, string> = {
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
function getGradient(name: string) {
  const f = name[0]?.toUpperCase() ?? "A";
  return avatarGradient[f] ?? "from-zinc-400 to-zinc-600";
}

// ── Inline field row ──────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 min-h-[38px] border-b border-zinc-100 px-5 py-1">
      <span className="w-44 shrink-0 text-sm text-zinc-400">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

const inputCls = "w-full text-sm text-zinc-900 bg-transparent outline-none py-1 px-2 -mx-2 rounded hover:bg-zinc-50 focus:bg-zinc-50 focus:ring-1 focus:ring-brand-400 placeholder:text-zinc-300 transition-colors";
const selectCls = "w-full text-sm text-zinc-900 bg-transparent outline-none py-1 px-2 -mx-2 rounded hover:bg-zinc-50 focus:bg-zinc-50 focus:ring-1 focus:ring-brand-400 cursor-pointer transition-colors";
const numInputCls = "w-full text-sm text-zinc-900 bg-transparent outline-none py-1 px-2 -mx-2 rounded hover:bg-zinc-50 focus:bg-zinc-50 focus:ring-1 focus:ring-brand-400 [appearance:textfield] transition-colors";

// ── Single-doc upload row ────────────────────────────────────────────────────

function SingleDocRow({
  label, doc, uploading, inputRef, onUpload, onDelete, required,
}: {
  label: string; doc: LeadDocument | null | undefined; uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: () => void; required?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-h-[42px] border-b border-zinc-100 px-5 py-2">
      <div className="w-44 shrink-0 flex items-center gap-1.5">
        <span className="text-xs font-semibold text-zinc-600">{label}</span>
        {required && <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-100 rounded-full px-1.5 py-0.5">req</span>}
      </div>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        {doc ? (
          <div className="flex items-center justify-between gap-2 w-full">
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 border border-brand-200/80 px-2.5 py-1 rounded-lg transition-colors truncate max-w-[200px]"
              title={doc.name}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13h4M10 17h4"/></svg>
              View file <span className="font-normal opacity-75 text-[11px] truncate">({doc.name})</span>
            </a>
            <button type="button" onClick={onDelete} className="shrink-0 text-zinc-300 hover:text-red-500 p-1" title="Delete file">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/></svg>
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold disabled:opacity-50 border border-brand-200 bg-brand-50/50 hover:bg-brand-50 px-3 py-1 rounded-lg transition-colors">
            {uploading ? "Uploading..." : "Upload"}
          </button>
        )}
        <input ref={inputRef} type="file" className="hidden" onChange={onUpload} />
      </div>
    </div>
  );
}

// ── Array-doc upload row ──────────────────────────────────────────────────────

function ArrayDocRow({
  label, docs, uploading, inputRef, onUpload, onDelete, required,
}: {
  label: string; docs: LeadDocument[]; uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (url: string) => void; required?: boolean;
}) {
  return (
    <div className="border-b border-zinc-100 px-5 py-2">
      <div className="flex items-center gap-3 min-h-[36px]">
        <div className="w-44 shrink-0 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-zinc-600">{label}</span>
          {required && <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-100 rounded-full px-1.5 py-0.5">req</span>}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold disabled:opacity-50 border border-brand-200 bg-brand-50/50 hover:bg-brand-50 px-3 py-1 rounded-lg transition-colors">
            {uploading ? "Uploading..." : docs.length > 0 ? `+ Upload (${docs.length})` : "Upload"}
          </button>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={onUpload} />
        </div>
      </div>
      {docs.length > 0 && (
        <div className="ml-[188px] space-y-1.5 pt-1.5">
          {docs.map((doc) => (
            <div key={doc.url} className="flex items-center justify-between gap-2">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 border border-brand-200/80 px-2.5 py-1 rounded-lg transition-colors truncate max-w-[200px]"
                title={doc.name}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13h4M10 17h4"/></svg>
                View file <span className="font-normal opacity-75 text-[11px] truncate">({doc.name})</span>
              </a>
              <button type="button" onClick={() => onDelete(doc.url)} className="shrink-0 text-zinc-300 hover:text-red-500 p-0.5" title="Delete file">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-5 pt-4 pb-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
    </div>
  );
}

// ── Main drawer component ──────────────────────────────────────────────────────

export default function LeadDrawer({
  lead, onClose, onSubmit, onDelete,
  onDocumentsChange, onProposalDocChange, onRegistrationDocChange,
  onAdmissionLetterChange, onInvoicesChange, onOtcInvoicesChange,
  onInvitationLetterChange, onThirdPaymentInvoicesChange, onVisaDocumentsChange,
}: {
  lead: DrawerLead;
  onClose: () => void;
  onSubmit: (data: LeadUpdate) => Promise<{ error?: string }>;
  onDelete: () => void;
  onDocumentsChange: (docs: LeadDocument[]) => void;
  onProposalDocChange: (doc: LeadDocument | null) => void;
  onRegistrationDocChange: (doc: LeadDocument | null) => void;
  onAdmissionLetterChange: (doc: LeadDocument | null) => void;
  onInvoicesChange: (docs: LeadDocument[]) => void;
  onOtcInvoicesChange: (docs: LeadDocument[]) => void;
  onInvitationLetterChange: (doc: LeadDocument | null) => void;
  onThirdPaymentInvoicesChange: (docs: LeadDocument[]) => void;
  onVisaDocumentsChange: (docs: LeadDocument[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<"main" | "statistics" | "media" | "tasks">("main");

  // ── Team members for agent assignment ────────────────────────────────────
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Fetch current logged-in user name
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.name) setCurrentUserName(d.user.name);
        if (d.user?.id) setCurrentUserId(d.user.id);
      })
      .catch(() => {});

    // Fetch ALL registered user accounts as agent options
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.agents)) setTeamMembers(d.agents);
      })
      .catch(() => {});
  }, []);

  // ── Events (tasks) for this lead ─────────────────────────────────────────
  type TaskType = "call" | "email" | "meeting" | "message";
  type LeadTask = { id: string; title: string; contact: string; type: TaskType; dueDate: string; done: boolean; leadId?: string; leadName?: string };
  const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const tasksLoadedRef = useRef(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventType, setNewEventType] = useState<TaskType>("call");
  const [newEventDate, setNewEventDate] = useState(() => {
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  });
  const [newEventSaving, setNewEventSaving] = useState(false);
  const [newEventError, setNewEventError] = useState("");

  // Chat state — must be declared before the useEffects that reference them
  const [convId, setConvId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; from: "me" | "them"; text: string; createdAt: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab !== "tasks" || tasksLoadedRef.current) return;
    tasksLoadedRef.current = true;
    setTasksLoading(true);
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        const all: LeadTask[] = data.tasks ?? [];
        setLeadTasks(all.filter((t) => t.leadId === lead.id));
      })
      .finally(() => setTasksLoading(false));
  }, [activeTab, lead.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChatLoading(true);
      try {
        const r = await fetch("/api/conversations");
        const { conversations = [] } = await r.json();
        const conv = (conversations as { id: string; name: string; whatsappId?: string }[]).find((c) =>
          lead.whatsappId ? c.whatsappId === lead.whatsappId : c.name.toLowerCase() === lead.name.toLowerCase()
        );
        if (cancelled || !conv) { if (!cancelled) setChatLoading(false); return; }
        setConvId(conv.id);
        const mr = await fetch(`/api/conversations/${conv.id}/messages`);
        const { messages = [] } = await mr.json();
        if (!cancelled) { setChatMessages(messages); setChatLoading(false); }
      } catch { if (!cancelled) setChatLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [lead.id, lead.name, lead.whatsappId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function handleSend() {
    if (!msgInput.trim() || !convId || sending) return;
    const text = msgInput.trim();
    setMsgInput("");
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    setChatMessages((prev) => [...prev, { id: tempId, from: "me", text, createdAt: new Date().toISOString() }]);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok) setChatMessages((prev) => prev.map((m) => m.id === tempId ? data.message : m));
    } catch {}
    setSending(false);
  }

  async function handleToggleTask(id: string, done: boolean) {
    setLeadTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
  }

  async function handleDeleteTask(id: string) {
    setLeadTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setNewEventError("");
    setNewEventSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEventTitle.trim(),
          contact: lead.name,
          type: newEventType,
          dueDate: new Date(newEventDate).toISOString(),
          leadId: lead.id,
          leadName: lead.name,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeadTasks((prev) => [...prev, data.task]);
        setNewEventTitle("");
        setShowNewEvent(false);
      } else {
        setNewEventError(data.error ?? "Failed to add task.");
      }
    } catch {
      setNewEventError("Failed to add task.");
    } finally {
      setNewEventSaving(false);
    }
  }

  // Contact fields
  const [name, setName] = useState(lead.name);
  const [email, setEmail] = useState(lead.email ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");

  // Client Visit Scope fields
  const [companyName, setCompanyName] = useState(lead.companyName ?? "");
  const [designation, setDesignation] = useState(lead.designation ?? "");
  const [yearlyVolume, setYearlyVolume] = useState<number | "">(lead.yearlyVolume ?? "");
  const [rateOfferedCN, setRateOfferedCN] = useState<number | "">(lead.rateOfferedCN ?? "");
  const [rateOfferedCard, setRateOfferedCard] = useState<number | "">(lead.rateOfferedCard ?? "");
  const [rateOfferedTTDD, setRateOfferedTTDD] = useState<number | "">(lead.rateOfferedTTDD ?? "");
  const [nextFollowUp, setNextFollowUp] = useState(lead.nextFollowUp ?? "");
  const [feedback, setFeedback] = useState(lead.feedback ?? "");
  const [clientVisitStatus, setClientVisitStatus] = useState<string>(lead.clientVisitStatus ?? "Live");
  // Education fields
  const [city, setCity] = useState(lead.city ?? "");
  const [state, setState] = useState(lead.state ?? "");
  const [neetStatus, setNeetStatus] = useState(lead.neetStatus ?? "");
  const [preferredCountry, setPreferredCountry] = useState(lead.preferredCountry ?? "");
  const [preferredUniversity1, setPreferredUniversity1] = useState(lead.preferredUniversity1 ?? "");
  const [preferredUniversity2, setPreferredUniversity2] = useState(lead.preferredUniversity2 ?? "");
  // The lead is always currently owned by the logged-in agent viewing it
  // (the dashboard only ever loads your own leads), so the picker defaults
  // to "you" regardless of the legacy assignAgent label on the lead.
  const [assignAgentId, setAssignAgentId] = useState("");

  useEffect(() => {
    if (!assignAgentId && currentUserId) {
      setAssignAgentId(currentUserId);
    }
  }, [currentUserId, assignAgentId]);
  // Pipeline fields
  const [color, setColor] = useState(lead.color ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [selectedServices, setSelectedServices] = useState<string[]>(
    lead.services && lead.services.length > 0
      ? lead.services
      : lead.serviceType
      ? [lead.serviceType]
      : ["Tours & Packages"]
  );
  const [stage, setStage] = useState<Stage>(lead.stage);
  // Payment fields
  const [firstPayment, setFirstPayment] = useState(lead.firstPayment ?? 0);
  const [secondPayment, setSecondPayment] = useState(lead.secondPayment ?? 0);
  const [thirdPaymentAmount, setThirdPaymentAmount] = useState(lead.thirdPaymentAmount ?? 0);
  const [otcAmount, setOtcAmount] = useState(lead.otcAmount ?? 0);
  const [totalServiceCharge, setTotalServiceCharge] = useState(lead.totalServiceCharge ?? 0);

  // Document state
  const [documents, setDocuments] = useState<LeadDocument[]>(lead.documents ?? []);
  const [proposalDoc, setProposalDoc] = useState<LeadDocument | null>(lead.proposalDoc ?? null);
  const [registrationDoc, setRegistrationDoc] = useState<LeadDocument | null>(lead.registrationDoc ?? null);
  const [admissionLetter, setAdmissionLetter] = useState<LeadDocument | null>(lead.admissionLetter ?? null);
  const [invoices, setInvoices] = useState<LeadDocument[]>(lead.invoices ?? []);
  const [otcInvoices, setOtcInvoices] = useState<LeadDocument[]>(lead.otcInvoices ?? []);
  const [invitationLetter, setInvitationLetter] = useState<LeadDocument | null>(lead.invitationLetter ?? null);
  const [thirdPaymentInvoices, setThirdPaymentInvoices] = useState<LeadDocument[]>(lead.thirdPaymentInvoices ?? []);
  const [visaDocuments, setVisaDocuments] = useState<LeadDocument[]>(lead.visaDocuments ?? []);

  // Upload loading states
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingProposal, setUploadingProposal] = useState(false);
  const [uploadingRegistration, setUploadingRegistration] = useState(false);
  const [uploadingLetter, setUploadingLetter] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingOtcInvoice, setUploadingOtcInvoice] = useState(false);
  const [uploadingInvitationLetter, setUploadingInvitationLetter] = useState(false);
  const [uploadingThirdPaymentInvoice, setUploadingThirdPaymentInvoice] = useState(false);
  const [uploadingVisaDoc, setUploadingVisaDoc] = useState(false);

  // Form state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showStageConfirm, setShowStageConfirm] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Refs
  const docInputRef = useRef<HTMLInputElement>(null);
  const proposalDocRef = useRef<HTMLInputElement>(null);
  const registrationDocRef = useRef<HTMLInputElement>(null);
  const letterInputRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const otcInvoiceInputRef = useRef<HTMLInputElement>(null);
  const invitationLetterInputRef = useRef<HTMLInputElement>(null);
  const thirdPaymentInvoiceInputRef = useRef<HTMLInputElement>(null);
  const visaDocInputRef = useRef<HTMLInputElement>(null);

  // Stage info
  const stageIndex = STAGES.indexOf(lead.stage);
  const nextStage = STAGES[stageIndex + 1] as Stage | undefined;
  const isAtFinalStage = !nextStage;
  const progressPct = Math.round(((stageIndex + 1) / STAGES.length) * 100);
  const daysActive = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  // ── Upload handlers ─────────────────────────────────────────────────────────

  async function uploadSingle(
    url: string, file: File,
    setter: (d: LeadDocument | null) => void,
    parentSetter: (d: LeadDocument | null) => void,
    setUploading: (v: boolean) => void,
    responseKey: string,
  ) {
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(url, { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        setter(data[responseKey]);
        parentSetter(data[responseKey]);
      } else {
        setError(data.error ?? "Upload failed.");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteSingle(
    url: string,
    setter: (d: null) => void,
    parentSetter: (d: null) => void,
  ) {
    await fetch(url, { method: "DELETE" });
    setter(null);
    parentSetter(null);
  }

  async function uploadArray(
    url: string, file: File,
    existing: LeadDocument[],
    setter: (d: LeadDocument[]) => void,
    parentSetter: (d: LeadDocument[]) => void,
    setUploading: (v: boolean) => void,
    responseKey: string,
  ) {
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(url, { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        const updated = [...existing, data[responseKey]];
        setter(updated);
        parentSetter(updated);
      } else {
        setError(data.error ?? "Upload failed.");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteArray(
    url: string, fileUrl: string,
    existing: LeadDocument[],
    setter: (d: LeadDocument[]) => void,
    parentSetter: (d: LeadDocument[]) => void,
  ) {
    await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: fileUrl }) });
    const updated = existing.filter((d) => d.url !== fileUrl);
    setter(updated);
    parentSetter(updated);
  }

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (docInputRef.current) docInputRef.current.value = "";
    for (const f of files) {
      await uploadArray(`/api/leads/${lead.id}/documents`, f, documents, setDocuments, onDocumentsChange, setUploadingDoc, "document");
    }
  };
  const handleDeleteDoc = (url: string) => deleteArray(`/api/leads/${lead.id}/documents`, url, documents, setDocuments, onDocumentsChange);

  const handleUploadProposal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (proposalDocRef.current) proposalDocRef.current.value = "";
    uploadSingle(`/api/leads/${lead.id}/proposal-doc`, f, setProposalDoc, onProposalDocChange, setUploadingProposal, "proposalDoc");
  };
  const handleDeleteProposal = () => deleteSingle(`/api/leads/${lead.id}/proposal-doc`, setProposalDoc, onProposalDocChange);

  const handleUploadRegistration = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (registrationDocRef.current) registrationDocRef.current.value = "";
    uploadSingle(`/api/leads/${lead.id}/registration-doc`, f, setRegistrationDoc, onRegistrationDocChange, setUploadingRegistration, "registrationDoc");
  };
  const handleDeleteRegistration = () => deleteSingle(`/api/leads/${lead.id}/registration-doc`, setRegistrationDoc, onRegistrationDocChange);

  const handleUploadLetter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (letterInputRef.current) letterInputRef.current.value = "";
    uploadSingle(`/api/leads/${lead.id}/admission-letter`, f, setAdmissionLetter, onAdmissionLetterChange, setUploadingLetter, "admissionLetter");
  };
  const handleDeleteLetter = () => deleteSingle(`/api/leads/${lead.id}/admission-letter`, setAdmissionLetter, onAdmissionLetterChange);

  const handleUploadInvoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (invoiceInputRef.current) invoiceInputRef.current.value = "";
    uploadArray(`/api/leads/${lead.id}/invoices`, f, invoices, setInvoices, onInvoicesChange, setUploadingInvoice, "invoice");
  };
  const handleDeleteInvoice = (url: string) => deleteArray(`/api/leads/${lead.id}/invoices`, url, invoices, setInvoices, onInvoicesChange);

  const handleUploadOtcInvoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (otcInvoiceInputRef.current) otcInvoiceInputRef.current.value = "";
    uploadArray(`/api/leads/${lead.id}/otc-invoices`, f, otcInvoices, setOtcInvoices, onOtcInvoicesChange, setUploadingOtcInvoice, "invoice");
  };
  const handleDeleteOtcInvoice = (url: string) => deleteArray(`/api/leads/${lead.id}/otc-invoices`, url, otcInvoices, setOtcInvoices, onOtcInvoicesChange);

  const handleUploadInvitationLetter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (invitationLetterInputRef.current) invitationLetterInputRef.current.value = "";
    uploadSingle(`/api/leads/${lead.id}/invitation-letter`, f, setInvitationLetter, onInvitationLetterChange, setUploadingInvitationLetter, "invitationLetter");
  };
  const handleDeleteInvitationLetter = () => deleteSingle(`/api/leads/${lead.id}/invitation-letter`, setInvitationLetter, onInvitationLetterChange);

  const handleUploadThirdPaymentInvoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (thirdPaymentInvoiceInputRef.current) thirdPaymentInvoiceInputRef.current.value = "";
    uploadArray(`/api/leads/${lead.id}/third-payment-invoices`, f, thirdPaymentInvoices, setThirdPaymentInvoices, onThirdPaymentInvoicesChange, setUploadingThirdPaymentInvoice, "invoice");
  };
  const handleDeleteThirdPaymentInvoice = (url: string) => deleteArray(`/api/leads/${lead.id}/third-payment-invoices`, url, thirdPaymentInvoices, setThirdPaymentInvoices, onThirdPaymentInvoicesChange);

  const handleUploadVisaDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (visaDocInputRef.current) visaDocInputRef.current.value = "";
    uploadArray(`/api/leads/${lead.id}/visa-documents`, f, visaDocuments, setVisaDocuments, onVisaDocumentsChange, setUploadingVisaDoc, "document");
  };
  const handleDeleteVisaDoc = (url: string) => deleteArray(`/api/leads/${lead.id}/visa-documents`, url, visaDocuments, setVisaDocuments, onVisaDocumentsChange);

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setError("");

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        setError("Phone number must be exactly 10 digits.");
        return;
      }
    }

    // If stage is changing, ask for confirmation first
    if (stage !== lead.stage) {
      setShowStageConfirm(true);
      return;
    }

    await doSubmit();
  }

  async function doSubmit() {
    setLoading(true);
    const assignAgentName =
      assignAgentId === currentUserId
        ? currentUserName
        : teamMembers.find((m) => m.id === assignAgentId)?.name ?? "";
    const result = await onSubmit({
      name, stage, email, phone, color, notes, services: selectedServices,
      city, state, neetStatus, preferredCountry, preferredUniversity1, preferredUniversity2,
      assignAgent: assignAgentName, ownerId: assignAgentId,
      firstPayment, secondPayment, thirdPaymentAmount, otcAmount, totalServiceCharge,
      companyName, designation,
      yearlyVolume: yearlyVolume !== "" ? Number(yearlyVolume) : 0,
      rateOfferedCN: rateOfferedCN !== "" ? Number(rateOfferedCN) : 0,
      rateOfferedCard: rateOfferedCard !== "" ? Number(rateOfferedCard) : 0,
      rateOfferedTTDD: rateOfferedTTDD !== "" ? Number(rateOfferedTTDD) : 0,
      nextFollowUp, feedback, clientVisitStatus,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  const tabs = [
    { id: "main", label: "Main" },
    { id: "statistics", label: "Statistics" },
    { id: "media", label: "Media" },
    { id: "tasks", label: "Tasks" },
  ] as const;

  const needsPanDoc = (lead.stage as string) === "KYC Pending";
  const needsPassportDoc = (lead.stage as string) === "KYC Approved";
  const needsFormA2Doc = lead.serviceType === "Outward Remittance" && (lead.stage as string) === "Rate Locked";

  const totalDocs = documents.length + (proposalDoc ? 1 : 0) + (registrationDoc ? 1 : 0) +
    (admissionLetter ? 1 : 0) + invoices.length + otcInvoices.length +
    (invitationLetter ? 1 : 0) + thirdPaymentInvoices.length + visaDocuments.length;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex">
        {/* Left Chat Link Panel */}
        <div className="flex-1 flex flex-col bg-zinc-50/80 border-r border-zinc-200">
          <div className="flex-none px-4 py-3.5 flex items-center gap-3 border-b border-zinc-200 bg-white">
            <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${getGradient(lead.name)} text-xs font-bold text-white shadow-2xs`}>
              {initials(lead.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-zinc-900 truncate">{lead.name}</p>
              <p className="text-[11px] font-medium text-zinc-500">{lead.channel} · Chat</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {chatLoading ? (
              <div className="space-y-4 pt-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <div className={`h-8 rounded-2xl animate-pulse ${i % 2 === 0 ? "w-36 bg-zinc-200" : "w-28 bg-emerald-100"}`} />
                  </div>
                ))}
              </div>
            ) : !convId ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 mb-3 border border-zinc-200/80">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-xs font-bold text-zinc-700">No conversation linked</p>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">Start a chat from the Chats page to link it here.</p>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-zinc-400 font-medium">No messages yet</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs leading-snug shadow-2xs ${
                    msg.from === "me"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-white text-zinc-800 border border-zinc-200/80 rounded-bl-none"
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-emerald-100" : "text-zinc-400"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {convId && (
            <div className="flex-none border-t border-zinc-200 bg-white px-3 py-3 flex items-end gap-2">
              <textarea
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!msgInput.trim() || sending}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-2xs"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Right Drawer */}
        <div className="flex w-full max-w-lg flex-col bg-white shadow-2xl">
          {/* Header */}
          <div className="bg-white border-b border-zinc-200 flex-none">
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
              <button onClick={onClose} className="flex-none p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${getGradient(lead.name)} text-xs font-bold text-white shadow-2xs`}>
                {initials(lead.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-black text-zinc-900 leading-tight truncate">{lead.name}</p>
              </div>
              <button onClick={onClose} className="flex-none p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="px-5 pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stageColor[lead.stage] ?? "bg-zinc-400"}`} />
                  <span className="text-xs font-bold text-zinc-800">{lead.stage}</span>
                  <span className="text-[11px] font-medium text-zinc-400">({formatRelativeTime(lead.createdAt)})</span>
                </div>
                {!isAtFinalStage && (
                  <span className="text-xs font-extrabold text-emerald-700">{progressPct}%</span>
                )}
              </div>
              <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-1 rounded-full transition-all ${stageColor[lead.stage] ?? "bg-emerald-500"}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex border-t border-zinc-200 px-3 bg-zinc-50/50">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 ${
                    activeTab === tab.id
                      ? "text-emerald-800 border-emerald-600 font-extrabold"
                      : "text-zinc-500 border-transparent hover:text-zinc-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

        {/* ── Scrollable content ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Error banner */}
          {error && (
            <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
          )}

          {/* ── MAIN TAB ──────────────────────────────────────────────────── */}
          {activeTab === "main" && (
            <div className="pb-4">
              <SectionHeader label="Contact" />
              <FieldRow label="Contact name">
                <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="..." />
              </FieldRow>
              <FieldRow label="Phone">
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className={inputCls}
                  placeholder="e.g. 9876543210"
                />
              </FieldRow>
              <FieldRow label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="..." />
              </FieldRow>
              <FieldRow label="Services">
                <div className="flex flex-wrap gap-1.5 py-1">
                  {SERVICES.map((svc) => {
                    const isSelected = selectedServices.includes(svc);
                    return (
                      <label
                        key={svc}
                        className={`flex items-center gap-1 cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                          isSelected
                            ? "bg-brand-50 border-brand-500 text-brand-700"
                            : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedServices((prev) =>
                              prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
                            );
                          }}
                          className="h-3 w-3 rounded text-brand-600 focus:ring-brand-500"
                        />
                        {svc}
                      </label>
                    );
                  })}
                </div>
              </FieldRow>
              <FieldRow label="City">
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="..." />
              </FieldRow>
              <FieldRow label="State">
                <input value={state} onChange={(e) => setState(e.target.value)} className={inputCls} placeholder="..." />
              </FieldRow>

              <SectionHeader label="Pipeline" />
              <FieldRow label="Channel">
                <span className="text-sm text-zinc-900 py-1 px-2 inline-block">{lead.channel}</span>
              </FieldRow>
              <FieldRow label="Assign User">
                <select
                  value={assignAgentId}
                  onChange={(e) => setAssignAgentId(e.target.value)}
                  className={selectCls}
                >
                  {/* Current user always appears first */}
                  {currentUserId && (
                    <option value={currentUserId}>{currentUserName} (You)</option>
                  )}
                  {/* Team members */}
                  {teamMembers
                    .filter((m) => m.id !== currentUserId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  {/* Fallback if no data yet */}
                  {!currentUserId && !teamMembers.length && (
                    <option value="">Loading...</option>
                  )}
                </select>
              </FieldRow>
              <FieldRow label="Stage">
                {isAtFinalStage ? (
                  <span className="text-sm text-brand-600 font-medium inline-flex items-center gap-1">
                    {lead.stage}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                ) : (
                  <select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className={selectCls}>
                    <option value={lead.stage}>{lead.stage} (current)</option>
                    <option value={nextStage!}>→ {nextStage}</option>
                  </select>
                )}
              </FieldRow>
              <FieldRow label="Card colour">
                <div className="flex items-center gap-1.5 py-1">
                  {LEAD_COLORS.map((c) => (
                    <button key={c.value} type="button" title={c.label} onClick={() => setColor(c.value)}
                      className={`h-5 w-5 rounded-full border-2 ${c.dot} transition-all hover:scale-110 ${color === c.value ? "border-zinc-700 scale-110 ring-2 ring-offset-1 ring-zinc-400" : "border-white shadow"}`}
                    />
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="Set Reminder">
                <button
                  type="button"
                  onClick={() => setShowReminderModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all shadow-2xs"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  Set Reminder Alert
                </button>
              </FieldRow>

              <SectionHeader label="Documents" />
              <ArrayDocRow label="Upload Documents" docs={documents} uploading={uploadingDoc} inputRef={docInputRef} onUpload={handleUploadDoc} onDelete={handleDeleteDoc} />

              <SectionHeader label="Notes" />
              <div className="px-5 py-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add notes about this lead..."
                  className="w-full resize-none text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 placeholder:text-zinc-300 transition-colors"
                />
              </div>
            </div>
          )}

          {/* ── STATISTICS TAB ─────────────────────────────────────────────── */}
          {activeTab === "statistics" && (
            <div className="pb-4">
              <SectionHeader label="Activity" />
              <div className="px-5 py-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-5xl font-bold text-indigo-500">{daysActive}</span>
                </div>
                <p className="text-sm text-indigo-400 font-medium">Days active</p>
              </div>

              <div className="space-y-0">
                {[
                  { label: "Total documents", value: String(totalDocs) },
                  { label: "General files", value: String(documents.length) },
                  { label: "Stage invoices", value: String(invoices.length + otcInvoices.length + thirdPaymentInvoices.length) },
                  { label: "Visa documents", value: String(visaDocuments.length) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-100">
                    <span className="text-sm text-zinc-600">{row.label}</span>
                    <span className="text-sm font-semibold text-zinc-900">{row.value}</span>
                  </div>
                ))}
              </div>

              <SectionHeader label="Pipeline Progress" />
              <div className="px-5 py-3 space-y-2.5">
                {STAGES.map((s, i) => (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full flex-none ${i <= stageIndex ? (stageColor[s] ?? "bg-zinc-400") : "bg-zinc-200"}`} />
                    <span className={`text-xs flex-1 ${i === stageIndex ? "font-semibold text-zinc-900" : i < stageIndex ? "text-zinc-500 line-through" : "text-zinc-400"}`}>{s}</span>
                    {i === stageIndex && <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 rounded-full px-2 py-0.5">Current</span>}
                    {i < stageIndex && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-500"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                ))}
              </div>

              <SectionHeader label="Lead Info" />
              <div className="px-5 py-1 space-y-0">
                {[
                  { label: "Created", value: formatRelativeTime(lead.createdAt) },
                  { label: "Channel", value: lead.channel },
                  { label: "ID", value: lead.id.slice(0, 8).toUpperCase() },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-zinc-100">
                    <span className="text-sm text-zinc-500">{row.label}</span>
                    <span className="text-sm text-zinc-900 font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MEDIA TAB ──────────────────────────────────────────────────── */}
          {activeTab === "media" && (
            <div className="pb-4">
              <SectionHeader label="General Documents" />
              <div className="px-5 pt-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-400">{documents.length} of 10 files uploaded</p>
                  {documents.length < 10 && (
                    <button type="button" onClick={() => docInputRef.current?.click()} disabled={uploadingDoc}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                      {uploadingDoc ? "Uploading..." : "Upload file"}
                    </button>
                  )}
                  <input ref={docInputRef} type="file" className="hidden" onChange={handleUploadDoc} />
                </div>
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-zinc-200">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-300 mb-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <p className="text-sm text-zinc-400">No files uploaded yet</p>
                    <p className="text-xs text-zinc-300 mt-0.5">Click Upload to add files</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li key={doc.url} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-zinc-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <a href={doc.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm text-brand-600 hover:underline">{doc.name}</a>
                        <span className="shrink-0 text-[10px] text-zinc-400">{formatRelativeTime(doc.uploadedAt)}</span>
                        <button type="button" onClick={() => handleDeleteDoc(doc.url)} className="shrink-0 text-zinc-300 hover:text-red-500">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {/* ── EVENTS TAB ────────────────────────────────────────────────── */}
          {activeTab === "tasks" && (
            <div className="pb-4">
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tasks</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{leadTasks.length} linked task{leadTasks.length !== 1 ? "s" : ""}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewEvent((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                  New task
                </button>
              </div>

              {/* New event form */}
              {showNewEvent && (
                <form onSubmit={handleAddEvent} className="mx-4 mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                  {newEventError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{newEventError}</div>
                  )}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-500">Title</label>
                    <input
                      required
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="e.g. Follow-up call"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-500">Type</label>
                      <select
                        value={newEventType}
                        onChange={(e) => setNewEventType(e.target.value as TaskType)}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                      >
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="meeting">Meeting</option>
                        <option value="message">Message</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-500">Date &amp; time</label>
                      <input
                        required
                        type="datetime-local"
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowNewEvent(false); setNewEventError(""); }}
                      className="flex-1 rounded-xl border border-zinc-200 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={newEventSaving}
                      className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                    >
                      {newEventSaving ? "Adding..." : "Add task"}
                    </button>
                  </div>
                </form>
              )}

              {/* Event list */}
              {tasksLoading ? (
                <div className="space-y-2 px-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3 items-center animate-pulse rounded-2xl border border-zinc-100 p-3">
                      <div className="h-8 w-8 rounded-xl bg-zinc-200" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-32 rounded bg-zinc-200" />
                        <div className="h-2.5 w-20 rounded bg-zinc-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : leadTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-zinc-500">No tasks yet</p>
                  <p className="mt-1 text-xs text-zinc-400">Add a call, meeting, or reminder for this lead.</p>
                </div>
              ) : (
                <ul className="space-y-2 px-4">
                  {leadTasks.map((task) => {
                    const typeColor: Record<string, string> = { call: "bg-blue-50 text-blue-600", email: "bg-amber-50 text-amber-600", meeting: "bg-violet-50 text-violet-600", message: "bg-brand-50 text-brand-600" };
                    const typeIcon: Record<string, string> = {
                      call: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.41 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9A16 16 0 0 0 15 16.09l1.36-1.37a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 23 16.92z",
                      email: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",
                      meeting: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2",
                      message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
                    };
                    const due = new Date(task.dueDate);
                    const isPast = due < new Date() && !task.done;
                    return (
                      <li key={task.id} className={`group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${task.done ? "border-zinc-100 bg-zinc-50/50 opacity-60" : isPast ? "border-red-100 bg-red-50/30" : "border-zinc-200 bg-white"}`}>
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                          className="h-4 w-4 flex-none rounded border-zinc-300 accent-brand-600"
                        />
                        <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-xl ${typeColor[task.type]}`}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d={typeIcon[task.type]} />
                          </svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-xs font-semibold ${task.done ? "text-zinc-400 line-through" : "text-zinc-900"}`}>{task.title}</p>
                          <p className={`text-[11px] mt-0.5 ${isPast && !task.done ? "text-red-500 font-semibold" : "text-zinc-400"}`}>
                            {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })} {due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="flex-none text-zinc-200 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/></svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Stage change confirmation overlay ─────────────────────────────── */}
        {showStageConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowStageConfirm(false)}>
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 pt-5 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">Move to next stage?</h3>
                <p className="text-sm text-zinc-500">
                  This will advance <span className="font-semibold text-zinc-800">{lead.name}</span> from{" "}
                  <span className="font-semibold text-zinc-800">{lead.stage}</span> to{" "}
                  <span className="font-semibold text-brand-600">{stage}</span>.
                </p>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button
                  type="button"
                  onClick={() => setShowStageConfirm(false)}
                  className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { setShowStageConfirm(false); doSubmit(); }}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? "Moving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="flex-none flex items-center justify-between gap-3 px-4 py-3 border-t border-zinc-100 bg-white">
          <button type="button" onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round"/></svg>
            Delete
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors">
              {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
        </div>{/* end lead drawer */}
      </div>{/* end split container */}

      {showReminderModal && (
        <SetReminderModal
          leadId={lead.id}
          leadName={lead.name}
          onClose={() => setShowReminderModal(false)}
          onSaved={(_reminderAt, note) => {
            setNotes(note);
          }}
        />
      )}
    </>
  );
}
