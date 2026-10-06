"use client";

import { useEffect, useRef, useState } from "react";
import { exportLeadsToExcel, type ExportLeadItem } from "@/lib/exportLeads";

interface ExportLeadsButtonProps {
  filteredLeads: ExportLeadItem[];
  allLeads: ExportLeadItem[];
  fileNamePrefix?: string;
  className?: string;
}

export default function ExportLeadsButton({
  filteredLeads,
  allLeads,
  fileNamePrefix = "CRM_Leads",
  className = "",
}: ExportLeadsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState<"filtered" | "all">("filtered");
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Toast auto-hide
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const hasFilterActive = filteredLeads.length !== allLeads.length;
  const currentCount = scope === "filtered" ? filteredLeads.length : allLeads.length;

  async function handleExport(overrideScope?: "filtered" | "all", overrideFormat?: "xlsx" | "csv") {
    const targetScope = overrideScope || scope;
    const targetFormat = overrideFormat || format;
    const targetLeads = targetScope === "filtered" ? filteredLeads : allLeads;

    if (!targetLeads || targetLeads.length === 0) {
      setToastMessage("No leads found in selected scope to export.");
      return;
    }

    try {
      setIsExporting(true);
      // Small tick to allow UI to show spinner
      await new Promise((resolve) => setTimeout(resolve, 80));

      const prefix = `${fileNamePrefix}_${targetScope === "filtered" && hasFilterActive ? "Filtered" : "All"}`;
      const result = exportLeadsToExcel(targetLeads, {
        fileNamePrefix: prefix,
        format: targetFormat,
        includeSummarySheet: targetFormat === "xlsx",
      });

      setIsOpen(false);
      setToastMessage(`Exported ${result.count} leads to ${result.fileName}`);
    } catch (err: any) {
      console.error("[export-error]", err);
      setToastMessage(err?.message || "Failed to export leads.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* ── Main Export Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isExporting}
        className={`flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:border-emerald-500 hover:bg-emerald-50/40 hover:text-emerald-800 active:scale-95 transition-all cursor-pointer ${
          isOpen ? "border-emerald-500 bg-emerald-50/60 text-emerald-800 ring-2 ring-emerald-100" : ""
        } ${className}`}
        title="Export leads to Excel spreadsheet (.xlsx)"
        aria-expanded={isOpen}
      >
        {isExporting ? (
          <svg className="h-4 w-4 animate-spin text-emerald-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            {/* Excel spreadsheet icon */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </span>
        )}

        <span className="font-bold">Export Excel</span>

        {/* Count pill */}
        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-black text-zinc-600">
          {filteredLeads.length}
        </span>

        {/* Dropdown Chevron */}
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ── Dropdown Popover ── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl bg-white p-4 shadow-2xl border border-zinc-200/90 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-black text-zinc-900 leading-tight">Export Leads</h4>
                <p className="text-[10.5px] font-medium text-zinc-400">Download formatted spreadsheet</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Scope Selector */}
          <div className="pt-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
              Select Leads Scope
            </label>
            <div className="space-y-1.5">
              {/* Option: Filtered leads */}
              <button
                type="button"
                onClick={() => setScope("filtered")}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all border ${
                  scope === "filtered"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold shadow-2xs"
                    : "border-zinc-200/70 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      scope === "filtered" ? "bg-emerald-600" : "bg-zinc-300"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold leading-tight">Current Filtered View</p>
                    <p className="text-[10px] text-zinc-400 font-normal">
                      {hasFilterActive ? "Active filters applied" : "Matches all visible leads"}
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-white border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-800 shadow-2xs">
                  {filteredLeads.length}
                </span>
              </button>

              {/* Option: All leads */}
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all border ${
                  scope === "all"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold shadow-2xs"
                    : "border-zinc-200/70 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      scope === "all" ? "bg-emerald-600" : "bg-zinc-300"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold leading-tight">All My Leads</p>
                    <p className="text-[10px] text-zinc-400 font-normal">Entire lead database</p>
                  </div>
                </div>
                <span className="rounded-lg bg-white border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-800 shadow-2xs">
                  {allLeads.length}
                </span>
              </button>
            </div>
          </div>

          {/* Format Selection */}
          <div className="pt-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
              File Format
            </label>
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFormat("xlsx")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  format === "xlsx"
                    ? "bg-white text-emerald-800 shadow-xs border border-emerald-200/60 font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  format === "csv"
                    ? "bg-white text-zinc-900 shadow-xs border border-zinc-200 font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                CSV (.csv)
              </button>
            </div>
            {format === "xlsx" && (
              <p className="mt-1 text-[10px] text-zinc-400 italic">
                Includes full lead columns + Pipeline Summary KPI sheet.
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-zinc-100 mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport()}
              disabled={isExporting || currentCount === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white py-2.5 px-3 text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {isExporting ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Generating Excel...</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download {currentCount} Leads</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-zinc-900 text-white px-4 py-3 text-xs font-bold shadow-2xl border border-zinc-700/80 animate-fadeIn">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            ✓
          </span>
          <span className="text-zinc-100">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
