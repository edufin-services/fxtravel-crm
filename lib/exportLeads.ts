import * as XLSX from "xlsx";

export interface ExportLeadItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  stage: string;
  channel: string;
  value?: number;
  serviceType?: string;
  services?: string[];
  city?: string;
  state?: string;
  companyName?: string;
  designation?: string;
  yearlyVolume?: number;
  clientVisitStatus?: string;
  nextFollowUp?: string;
  reminderAt?: string;
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string;
  ownerName?: string;
  assignAgent?: string;
  assignedBranchName?: string;
  notes?: string;
  formNotes?: string;
  sourceCurrency?: string;
  targetCurrency?: string;
  exchangeRate?: number;
  sourceAmount?: number;
  targetAmount?: number;
  fulfillmentType?: string;
  deliveryAddress?: string;
  panNumber?: string;
  passportNumber?: string;
  travelDate?: string;
  [key: string]: any;
}

export interface ExportOptions {
  fileNamePrefix?: string;
  format?: "xlsx" | "csv";
  includeSummarySheet?: boolean;
}

/**
 * Formats ISO date string to readable IST date string
 */
export function formatExportDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

/**
 * Maps a single lead item to a clean, well-formatted row dictionary for Excel
 */
export function mapLeadToExcelRow(lead: ExportLeadItem): Record<string, string | number> {
  const service =
    lead.serviceType ||
    (Array.isArray(lead.services) && lead.services.length > 0 ? lead.services.join(", ") : "") ||
    "";

  const row: Record<string, string | number> = {
    "Lead ID": lead.id || "",
    "Full Name": lead.name || "",
    "Phone Number": lead.phone ? String(lead.phone) : "",
    "Email": lead.email || "",
    "Stage": lead.stage || "Initial",
    "Source / Channel": lead.channel || "Direct",
    "Deal Value (INR)": typeof lead.value === "number" ? lead.value : 0,
    "Service / Tour Type": service,
    "City": lead.city || "",
    "State": lead.state || "",
    "Company / Client": lead.companyName || "",
    "Designation": lead.designation || "",
    "Annual Volume (INR)": typeof lead.yearlyVolume === "number" ? lead.yearlyVolume : 0,
    "Visit Status": lead.clientVisitStatus || "",
    "Next Follow Up": lead.nextFollowUp || "",
    "Reminder Date": formatExportDate(lead.reminderAt),
    "Created Date": formatExportDate(lead.createdAt),
    "Updated Date": formatExportDate(lead.updatedAt),
    "Confirmed Date": formatExportDate(lead.confirmedAt),
    "Executive / Agent": lead.ownerName || lead.assignAgent || "",
    "Assigned Branch": lead.assignedBranchName || "",
    "Notes": lead.notes || "",
    "Form / Web Enquiry Notes": lead.formNotes || "",
  };

  // If there are Forex details, append them
  if (lead.sourceCurrency || lead.targetCurrency || lead.sourceAmount) {
    row["Source Currency"] = lead.sourceCurrency || "INR";
    row["Target Currency"] = lead.targetCurrency || "";
    row["Exchange Rate"] = typeof lead.exchangeRate === "number" ? lead.exchangeRate : 0;
    row["Source Amount"] = typeof lead.sourceAmount === "number" ? lead.sourceAmount : 0;
    row["Target Amount"] = typeof lead.targetAmount === "number" ? lead.targetAmount : 0;
    row["PAN Number"] = lead.panNumber || "";
    row["Passport Number"] = lead.passportNumber || "";
    row["Fulfillment Type"] = lead.fulfillmentType || "";
    row["Travel Date"] = lead.travelDate ? formatExportDate(lead.travelDate) : "";
  }

  return row;
}

/**
 * Builds KPI and breakdown summary rows for the secondary sheet
 */
export function buildSummarySheetRows(leads: ExportLeadItem[]): Record<string, string | number>[] {
  const now = new Date();
  const totalLeads = leads.length;
  const totalValue = leads.reduce((acc, curr) => acc + (typeof curr.value === "number" ? curr.value : 0), 0);
  const confirmedLeads = leads.filter((l) => l.stage === "Confirmed");
  const confirmedValue = confirmedLeads.reduce(
    (acc, curr) => acc + (typeof curr.value === "number" ? curr.value : 0),
    0
  );
  const avgValue = totalLeads > 0 ? Math.round(totalValue / totalLeads) : 0;

  // Stage breakdown
  const stageCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const s = l.stage || "Initial";
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });

  // Channel breakdown
  const channelCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const c = l.channel || "Direct";
    channelCounts[c] = (channelCounts[c] || 0) + 1;
  });

  const rows: Record<string, string | number>[] = [
    { "Metric / Breakdown": "=== REPORT SUMMARY ===", "Details / Count": "" },
    { "Metric / Breakdown": "Report Generated At", "Details / Count": formatExportDate(now.toISOString()) },
    { "Metric / Breakdown": "Total Leads Exported", "Details / Count": totalLeads },
    { "Metric / Breakdown": "Total Pipeline Value (INR)", "Details / Count": totalValue },
    { "Metric / Breakdown": "Average Lead Value (INR)", "Details / Count": avgValue },
    { "Metric / Breakdown": "Confirmed Deals Count", "Details / Count": confirmedLeads.length },
    { "Metric / Breakdown": "Confirmed Revenue (INR)", "Details / Count": confirmedValue },
    { "Metric / Breakdown": "", "Details / Count": "" },
    { "Metric / Breakdown": "=== STAGE BREAKDOWN ===", "Details / Count": "" },
    ...Object.entries(stageCounts).map(([stage, count]) => ({
      "Metric / Breakdown": `Stage: ${stage}`,
      "Details / Count": count,
    })),
    { "Metric / Breakdown": "", "Details / Count": "" },
    { "Metric / Breakdown": "=== SOURCE / CHANNEL BREAKDOWN ===", "Details / Count": "" },
    ...Object.entries(channelCounts).map(([channel, count]) => ({
      "Metric / Breakdown": `Channel: ${channel}`,
      "Details / Count": count,
    })),
  ];

  return rows;
}

/**
 * Creates an XLSX workbook from lead items
 */
export function createLeadsWorkbook(
  leads: ExportLeadItem[],
  options?: ExportOptions
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Primary Sheet: Leads Data
  const leadRows = leads.map(mapLeadToExcelRow);
  const ws = XLSX.utils.json_to_sheet(leadRows);

  // Column width configuration
  ws["!cols"] = [
    { wch: 14 }, // Lead ID
    { wch: 22 }, // Full Name
    { wch: 16 }, // Phone Number
    { wch: 26 }, // Email
    { wch: 14 }, // Stage
    { wch: 18 }, // Source / Channel
    { wch: 18 }, // Deal Value (INR)
    { wch: 22 }, // Service / Tour Type
    { wch: 16 }, // City
    { wch: 16 }, // State
    { wch: 22 }, // Company / Client
    { wch: 16 }, // Designation
    { wch: 18 }, // Annual Volume (INR)
    { wch: 16 }, // Visit Status
    { wch: 18 }, // Next Follow Up
    { wch: 22 }, // Reminder Date
    { wch: 22 }, // Created Date
    { wch: 22 }, // Updated Date
    { wch: 22 }, // Confirmed Date
    { wch: 20 }, // Executive / Agent
    { wch: 18 }, // Assigned Branch
    { wch: 35 }, // Notes
    { wch: 35 }, // Form / Web Enquiry Notes
    { wch: 16 }, // Source Currency
    { wch: 16 }, // Target Currency
    { wch: 14 }, // Exchange Rate
    { wch: 16 }, // Source Amount
    { wch: 16 }, // Target Amount
    { wch: 16 }, // PAN Number
    { wch: 16 }, // Passport Number
    { wch: 16 }, // Fulfillment Type
    { wch: 20 }, // Travel Date
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Leads Data");

  // 2. Secondary Sheet: Summary & Metrics
  if (options?.includeSummarySheet !== false) {
    const summaryRows = buildSummarySheetRows(leads);
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    summaryWs["!cols"] = [{ wch: 34 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Pipeline Summary");
  }

  return wb;
}

/**
 * Client-side exporter: Builds workbook and triggers browser download
 */
export function exportLeadsToExcel(
  leads: ExportLeadItem[],
  options?: ExportOptions
): { success: boolean; count: number; fileName: string } {
  if (!leads || leads.length === 0) {
    throw new Error("No leads available to export.");
  }

  const format = options?.format || "xlsx";
  const dateStr = new Date().toISOString().slice(0, 10);
  const prefix = options?.fileNamePrefix || "CRM_Leads";
  const fileName = `${prefix}_${dateStr}.${format}`;

  const wb = createLeadsWorkbook(leads, options);

  if (format === "csv") {
    // For CSV, write only the primary sheet
    XLSX.writeFile(wb, fileName, { bookType: "csv" });
  } else {
    XLSX.writeFile(wb, fileName, { bookType: "xlsx" });
  }

  return { success: true, count: leads.length, fileName };
}
