import { MailIcon } from "../icons";

export default function MailPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Mail</h1>
        <p className="mt-0.5 text-sm text-zinc-400">Connect an email inbox to send and receive messages from your CRM.</p>
      </div>

      <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm">
          <MailIcon />
        </div>
        <h2 className="mt-5 text-base font-bold text-zinc-900">No inbox connected</h2>
        <p className="mt-2 max-w-xs text-center text-sm text-zinc-400">
          Connect your email account to manage conversations alongside your other channels.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
            Connect inbox
          </button>
          <p className="text-xs text-zinc-400">Supports Gmail, Outlook, and IMAP</p>
        </div>

        {/* Feature chips */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 max-w-sm">
          {["Send & receive emails", "Unified inbox", "Auto-assign to leads", "Email templates"].map((feat) => (
            <span key={feat} className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-500">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
