import "server-only";
import nodemailer from "nodemailer";
import {
  getAdminSettings,
  getAllUsers,
  getLeadActivities,
  LeadActivity,
  logEmailReport,
  updateReportSettings,
} from "./db";
import { LeadModel } from "./models";

export type ReportPeriod = "daily" | "weekly" | "manual";

export interface ReportItem {
  leadId: string;
  leadName: string;
  phone?: string;
  email?: string;
  channel?: string;
  ownerName?: string;
  previousStage?: string;
  newStage?: string;
  value?: number;
  details?: string;
  timestamp: string;
}

export interface ActivityReportData {
  period: ReportPeriod;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  recipient: string;
  stats: {
    totalNewLeads: number;
    totalStageChanges: number;
    totalConfirmed: number;
    totalConfirmedValue: number;
    channelBreakdown: Record<string, number>;
    stageBreakdown: Record<string, number>;
    agentBreakdown: Record<string, { newLeads: number; stageChanges: number; confirmed: number }>;
  };
  newLeads: ReportItem[];
  stageChanges: ReportItem[];
  confirmedLeads: ReportItem[];
  allActivities: LeadActivity[];
}

/**
 * Compiles activity records and lead data for the given period
 */
export async function generateActivityReport(
  period: ReportPeriod,
  options?: { fromDate?: Date; toDate?: Date; recipient?: string }
): Promise<ActivityReportData> {
  const now = options?.toDate || new Date();
  let startDate: Date;

  if (options?.fromDate) {
    startDate = options.fromDate;
  } else if (period === "weekly") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    // Default 24 hours for daily / manual
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const periodStart = startDate.toISOString();
  const periodEnd = now.toISOString();

  // 1. Fetch users for owner mapping
  const users = await getAllUsers();
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  // 2. Fetch logged activities in time window
  const activities = await getLeadActivities({
    since: periodStart,
    until: periodEnd,
    limit: 1000,
  });

  // 3. Fallback/Augment: Also check LeadModel for leads created or confirmed in window
  const leadsInPeriod = await LeadModel.find({
    createdAt: { $gte: periodStart, $lte: periodEnd },
    deletedAt: null,
  }).lean();

  const newLeadsMap = new Map<string, ReportItem>();
  const stageChangesList: ReportItem[] = [];
  const confirmedLeadsMap = new Map<string, ReportItem>();

  const channelBreakdown: Record<string, number> = {};
  const stageBreakdown: Record<string, number> = {};
  const agentBreakdown: Record<string, { newLeads: number; stageChanges: number; confirmed: number }> = {};

  const ensureAgent = (name: string) => {
    if (!agentBreakdown[name]) {
      agentBreakdown[name] = { newLeads: 0, stageChanges: 0, confirmed: 0 };
    }
    return agentBreakdown[name];
  };

  // Process activities
  for (const act of activities) {
    const ownerName = act.ownerName || userMap.get(act.ownerId || "") || "Unassigned";
    const item: ReportItem = {
      leadId: act.leadId,
      leadName: act.leadName,
      phone: act.phone,
      email: act.email,
      channel: act.channel || "Direct",
      ownerName,
      previousStage: act.previousStage,
      newStage: act.newStage,
      value: act.value || 0,
      details: act.details,
      timestamp: act.timestamp,
    };

    if (act.type === "new_lead") {
      newLeadsMap.set(act.leadId, item);
      channelBreakdown[item.channel || "Other"] = (channelBreakdown[item.channel || "Other"] || 0) + 1;
      ensureAgent(ownerName).newLeads += 1;
    } else if (act.type === "stage_change") {
      stageChangesList.push(item);
      if (act.newStage) {
        stageBreakdown[act.newStage] = (stageBreakdown[act.newStage] || 0) + 1;
      }
      ensureAgent(ownerName).stageChanges += 1;
    } else if (act.type === "lead_confirmed") {
      confirmedLeadsMap.set(act.leadId, item);
      ensureAgent(ownerName).confirmed += 1;
    }
  }

  // Augment from LeadModel for any leads created in period not in newLeadsMap
  for (const l of leadsInPeriod) {
    const ownerName = userMap.get(l.ownerId) || "Unassigned";
    if (!newLeadsMap.has(l.id)) {
      const item: ReportItem = {
        leadId: l.id,
        leadName: l.name,
        phone: l.phone,
        email: l.email,
        channel: l.channel || "WhatsApp",
        ownerName,
        newStage: l.stage,
        value: l.value || 0,
        details: `Created in stage "${l.stage}"`,
        timestamp: l.createdAt,
      };
      newLeadsMap.set(l.id, item);
      channelBreakdown[item.channel || "Other"] = (channelBreakdown[item.channel || "Other"] || 0) + 1;
      ensureAgent(ownerName).newLeads += 1;
    }

    if (l.stage === "Confirmed" && !confirmedLeadsMap.has(l.id)) {
      const item: ReportItem = {
        leadId: l.id,
        leadName: l.name,
        phone: l.phone,
        email: l.email,
        channel: l.channel || "WhatsApp",
        ownerName,
        newStage: "Confirmed",
        value: l.value || 0,
        details: `Confirmed Lead (${l.serviceType || "Forex / CRM"})`,
        timestamp: l.createdAt,
      };
      confirmedLeadsMap.set(l.id, item);
      ensureAgent(ownerName).confirmed += 1;
    }
  }

  const newLeads = Array.from(newLeadsMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const confirmedLeads = Array.from(confirmedLeadsMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const stageChanges = stageChangesList.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const totalConfirmedValue = confirmedLeads.reduce((acc, curr) => acc + (curr.value || 0), 0);

  const periodLabel = period === "weekly" ? "Weekly Executive Summary" : "Daily Activity & Stage Digest";
  const recipient = options?.recipient || process.env.E_EMAIL || process.env.ADMIN_EMAIL || "admin@fxpertise.com";

  return {
    period,
    periodLabel,
    periodStart,
    periodEnd,
    generatedAt: now.toISOString(),
    recipient,
    stats: {
      totalNewLeads: newLeads.length,
      totalStageChanges: stageChanges.length,
      totalConfirmed: confirmedLeads.length,
      totalConfirmedValue,
      channelBreakdown,
      stageBreakdown,
      agentBreakdown,
    },
    newLeads,
    stageChanges,
    confirmedLeads,
    allActivities: activities,
  };
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
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

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

/**
 * Builds high-converting, executive-grade HTML email
 */
export function buildReportEmailHtml(data: ActivityReportData): string {
  const fromName = process.env.EMAIL_FROM_NAME || "Fxpertise CRM";
  const startStr = formatDate(data.periodStart);
  const endStr = formatDate(data.periodEnd);
  const isWeekly = data.period === "weekly";

  const stageBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
    Initial: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    Connected: { bg: "#fef3c7", text: "#b45309", border: "#fde68a" },
    Confirmed: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
    Closed: { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
  };

  const renderBadge = (stage: string) => {
    const s = stageBadgeColors[stage] || { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" };
    return `<span style="display:inline-block;padding:3px 8px;font-size:11px;font-weight:700;border-radius:9999px;background-color:${s.bg};color:${s.text};border:1px solid ${s.border};">${stage}</span>`;
  };

  // Confirmed leads section
  const confirmedRows = data.confirmedLeads.map(
    (item) => `
    <tr style="border-bottom:1px solid #f4f4f5;">
      <td style="padding:10px 12px;font-weight:700;color:#18181b;">${item.leadName}</td>
      <td style="padding:10px 12px;color:#52525b;font-size:12px;">${item.phone || "—"}</td>
      <td style="padding:10px 12px;color:#52525b;font-size:12px;">${item.channel || "—"}</td>
      <td style="padding:10px 12px;color:#18181b;font-weight:600;font-size:12px;">${item.ownerName || "Unassigned"}</td>
      <td style="padding:10px 12px;color:#047857;font-weight:700;font-size:12px;text-align:right;">${item.value ? formatCurrency(item.value) : "—"}</td>
      <td style="padding:10px 12px;color:#a1a1aa;font-size:11px;text-align:right;">${formatDate(item.timestamp)}</td>
    </tr>`
  ).join("");

  // Stage changes section
  const stageRows = data.stageChanges.slice(0, 30).map(
    (item) => `
    <tr style="border-bottom:1px solid #f4f4f5;">
      <td style="padding:10px 12px;font-weight:600;color:#18181b;">${item.leadName}</td>
      <td style="padding:10px 12px;font-size:12px;">
        ${item.previousStage ? renderBadge(item.previousStage) : "—"}
        <span style="color:#a1a1aa;margin:0 4px;">&rarr;</span>
        ${item.newStage ? renderBadge(item.newStage) : "—"}
      </td>
      <td style="padding:10px 12px;color:#52525b;font-size:12px;">${item.ownerName || "System"}</td>
      <td style="padding:10px 12px;color:#71717a;font-size:11px;">${item.details || "—"}</td>
      <td style="padding:10px 12px;color:#a1a1aa;font-size:11px;text-align:right;">${formatDate(item.timestamp)}</td>
    </tr>`
  ).join("");

  // New leads section
  const newLeadRows = data.newLeads.slice(0, 30).map(
    (item) => `
    <tr style="border-bottom:1px solid #f4f4f5;">
      <td style="padding:10px 12px;font-weight:600;color:#18181b;">${item.leadName}</td>
      <td style="padding:10px 12px;color:#52525b;font-size:12px;">${item.phone || "—"}</td>
      <td style="padding:10px 12px;color:#52525b;font-size:12px;"><span style="display:inline-block;padding:2px 6px;font-size:10px;font-weight:600;border-radius:6px;background:#f4f4f5;color:#3f3f46;">${item.channel}</span></td>
      <td style="padding:10px 12px;color:#52525b;font-size:12px;">${item.ownerName || "Unassigned"}</td>
      <td style="padding:10px 12px;font-size:12px;">${item.newStage ? renderBadge(item.newStage) : "—"}</td>
      <td style="padding:10px 12px;color:#a1a1aa;font-size:11px;text-align:right;">${formatDate(item.timestamp)}</td>
    </tr>`
  ).join("");

  // Agent summary section
  const agentRows = Object.entries(data.stats.agentBreakdown).map(
    ([name, s]) => `
    <tr style="border-bottom:1px solid #f4f4f5;">
      <td style="padding:8px 12px;font-weight:600;color:#18181b;">${name}</td>
      <td style="padding:8px 12px;text-align:center;font-weight:700;color:#18181b;">${s.newLeads}</td>
      <td style="padding:8px 12px;text-align:center;font-weight:700;color:#3b82f6;">${s.stageChanges}</td>
      <td style="padding:8px 12px;text-align:center;font-weight:700;color:#047857;">${s.confirmed}</td>
    </tr>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${data.periodLabel}</title>
<style>
  body { margin:0; padding:0; background:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#18181b; }
  .wrapper { max-width:680px; margin:24px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.06); border:1px solid #e4e4e7; }
  .header { background:linear-gradient(135deg, #18181b 0%, #27272a 100%); padding:32px 36px; color:#ffffff; }
  .header-badge { display:inline-block; padding:4px 12px; border-radius:9999px; background:rgba(20,210,121,0.18); border:1px solid #14d279; color:#14d279; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px; }
  .header h1 { margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px; color:#ffffff; }
  .header p { margin:6px 0 0 0; font-size:13px; color:#a1a1aa; }
  .content { padding:28px 36px; }
  .kpi-grid { width:100%; border-collapse:separate; border-spacing:10px 0; margin-bottom:28px; }
  .kpi-card { background:#fafafa; border:1px solid #e4e4e7; border-radius:12px; padding:16px; text-align:center; }
  .kpi-num { font-size:24px; font-weight:800; color:#18181b; line-height:1.2; }
  .kpi-label { font-size:11px; font-weight:700; color:#71717a; text-transform:uppercase; letter-spacing:0.3px; margin-top:4px; }
  .section-title { font-size:14px; font-weight:800; color:#18181b; text-transform:uppercase; letter-spacing:0.5px; margin:24px 0 12px 0; display:flex; align-items:center; }
  .table-box { width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #e4e4e7; border-radius:10px; overflow:hidden; font-size:12px; margin-bottom:20px; }
  .table-box th { background:#f8fafc; padding:10px 12px; font-size:10px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.5px; border-bottom:1px solid #e2e8f0; }
  .empty-state { padding:24px; text-align:center; color:#a1a1aa; font-size:12px; font-style:italic; }
  .cta-btn { display:inline-block; padding:12px 24px; background:#14d279; color:#09090b; font-weight:800; font-size:13px; border-radius:10px; text-decoration:none; margin-top:16px; }
  .footer { background:#fafafa; border-top:1px solid #e4e4e7; padding:20px 36px; text-align:center; font-size:12px; color:#a1a1aa; line-height:1.5; }
</style>
</head>
<body>
<div class="wrapper">
  <!-- Header -->
  <div class="header">
    <div class="header-badge">${isWeekly ? "📅 Weekly Digest" : "⚡ Daily Digest"}</div>
    <h1>${data.periodLabel}</h1>
    <p>Coverage: <strong>${startStr}</strong> to <strong>${endStr}</strong> (IST)</p>
  </div>

  <div class="content">
    <!-- Executive KPI Grid -->
    <table class="kpi-grid" style="margin-left:-10px;width:calc(100% + 20px);">
      <tr>
        <td class="kpi-card" style="width:25%;">
          <div class="kpi-num" style="color:#0284c7;">+${data.stats.totalNewLeads}</div>
          <div class="kpi-label">New Leads</div>
        </td>
        <td class="kpi-card" style="width:25%;">
          <div class="kpi-num" style="color:#8b5cf6;">${data.stats.totalStageChanges}</div>
          <div class="kpi-label">Stage Changes</div>
        </td>
        <td class="kpi-card" style="width:25%;">
          <div class="kpi-num" style="color:#059669;">🎯 ${data.stats.totalConfirmed}</div>
          <div class="kpi-label">Confirmed</div>
        </td>
        <td class="kpi-card" style="width:25%;">
          <div class="kpi-num" style="color:#18181b;font-size:18px;">${data.stats.totalConfirmedValue ? formatCurrency(data.stats.totalConfirmedValue) : "—"}</div>
          <div class="kpi-label">Confirmed Vol</div>
        </td>
      </tr>
    </table>

    <!-- Section 1: Confirmed Leads -->
    <div style="margin-top:20px;">
      <h3 style="font-size:14px;font-weight:800;color:#047857;margin:0 0 10px 0;">🎯 Confirmed Leads &amp; Orders (${data.confirmedLeads.length})</h3>
      ${
        data.confirmedLeads.length > 0
          ? `<table class="table-box">
              <thead>
                <tr>
                  <th style="text-align:left;">Client Name</th>
                  <th style="text-align:left;">Phone</th>
                  <th style="text-align:left;">Source</th>
                  <th style="text-align:left;">Executive</th>
                  <th style="text-align:right;">Order Value</th>
                  <th style="text-align:right;">Confirmed At</th>
                </tr>
              </thead>
              <tbody>${confirmedRows}</tbody>
            </table>`
          : `<div class="table-box empty-state">No new confirmed leads in this period.</div>`
      }
    </div>

    <!-- Section 2: Stage Changes -->
    <div style="margin-top:24px;">
      <h3 style="font-size:14px;font-weight:800;color:#18181b;margin:0 0 10px 0;">🔄 Lead Stage Progressions (${data.stageChanges.length})</h3>
      ${
        data.stageChanges.length > 0
          ? `<table class="table-box">
              <thead>
                <tr>
                  <th style="text-align:left;">Lead Name</th>
                  <th style="text-align:left;">Stage Transition</th>
                  <th style="text-align:left;">Executive</th>
                  <th style="text-align:left;">Details</th>
                  <th style="text-align:right;">Time</th>
                </tr>
              </thead>
              <tbody>${stageRows}</tbody>
            </table>`
          : `<div class="table-box empty-state">No stage changes recorded in this period.</div>`
      }
    </div>

    <!-- Section 3: New Leads Created -->
    <div style="margin-top:24px;">
      <h3 style="font-size:14px;font-weight:800;color:#18181b;margin:0 0 10px 0;">📥 Newly Acquired Inquiries (${data.newLeads.length})</h3>
      ${
        data.newLeads.length > 0
          ? `<table class="table-box">
              <thead>
                <tr>
                  <th style="text-align:left;">Lead Name</th>
                  <th style="text-align:left;">Phone</th>
                  <th style="text-align:left;">Channel</th>
                  <th style="text-align:left;">Assigned To</th>
                  <th style="text-align:left;">Initial Stage</th>
                  <th style="text-align:right;">Created At</th>
                </tr>
              </thead>
              <tbody>${newLeadRows}</tbody>
            </table>`
          : `<div class="table-box empty-state">No new leads created in this period.</div>`
      }
    </div>

    <!-- Section 4: Team & Channel Activity Summary -->
    ${
      Object.keys(data.stats.agentBreakdown).length > 0
        ? `<div style="margin-top:24px;">
            <h3 style="font-size:14px;font-weight:800;color:#18181b;margin:0 0 10px 0;">📊 Executive Performance Breakdown</h3>
            <table class="table-box">
              <thead>
                <tr>
                  <th style="text-align:left;">Executive</th>
                  <th style="text-align:center;">New Leads Handled</th>
                  <th style="text-align:center;">Stage Updates</th>
                  <th style="text-align:center;">Deals Confirmed</th>
                </tr>
              </thead>
              <tbody>${agentRows}</tbody>
            </table>
          </div>`
        : ""
    }

    <!-- Call to action -->
    <div style="text-align:center;padding:20px 0 10px 0;">
      <a href="https://fxpertise.com/admin/leads" class="cta-btn">View All Leads in CRM &rarr;</a>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>
      <strong>${fromName} Automated Reporting Dispatcher</strong><br/>
      Delivered automatically to <strong>${data.recipient}</strong>.<br/>
      This summary was generated on ${formatDate(data.generatedAt)} (IST).
    </p>
  </div>
</div>
</body>
</html>`;
}

/**
 * Builds Plaintext email fallback
 */
export function buildReportEmailText(data: ActivityReportData): string {
  const fromName = process.env.EMAIL_FROM_NAME || "Fxpertise CRM";
  return `=== ${data.periodLabel.toUpperCase()} ===
Coverage: ${formatDate(data.periodStart)} to ${formatDate(data.periodEnd)} (IST)

--- EXECUTIVE SUMMARY ---
• New Leads: ${data.stats.totalNewLeads}
• Stage Transitions: ${data.stats.totalStageChanges}
• Confirmed Leads: ${data.stats.totalConfirmed}
• Total Confirmed Volume: ${formatCurrency(data.stats.totalConfirmedValue)}

--- CONFIRMED LEADS (${data.confirmedLeads.length}) ---
${
  data.confirmedLeads.length === 0
    ? "No confirmed leads."
    : data.confirmedLeads
        .map(
          (l) =>
            `• ${l.leadName} (${l.phone || "No phone"}) - Value: ${formatCurrency(l.value || 0)} - Agent: ${l.ownerName || "Unassigned"} - ${formatDate(l.timestamp)}`
        )
        .join("\n")
}

--- STAGE CHANGES (${data.stageChanges.length}) ---
${
  data.stageChanges.length === 0
    ? "No stage changes."
    : data.stageChanges
        .map(
          (s) =>
            `• ${s.leadName}: ${s.previousStage || "None"} -> ${s.newStage || "None"} (By: ${s.ownerName || "System"}) at ${formatDate(s.timestamp)}`
        )
        .join("\n")
}

--- NEW LEADS (${data.newLeads.length}) ---
${
  data.newLeads.length === 0
    ? "No new leads."
    : data.newLeads
        .map(
          (n) =>
            `• ${n.leadName} | Channel: ${n.channel} | Agent: ${n.ownerName} | Phone: ${n.phone || "N/A"} | Created: ${formatDate(n.timestamp)}`
        )
        .join("\n")
}

---
Dispatched by ${fromName} to ${data.recipient}.`;
}

/**
 * Dispatches the activity report email to E_EMAIL (or custom recipient)
 */
export async function sendActivityReportEmail(options?: {
  period?: ReportPeriod;
  customRecipient?: string;
  force?: boolean;
}): Promise<{ success: boolean; message: string; reportData?: ActivityReportData }> {
  const period = options?.period || "daily";
  const recipient =
    options?.customRecipient ||
    process.env.E_EMAIL ||
    process.env.ADMIN_EMAIL ||
    (await getAdminSettings()).email;

  const reportData = await generateActivityReport(period, { recipient });

  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const port = Number(process.env.EMAIL_PORT || 587);
  const fromName = process.env.EMAIL_FROM_NAME || "Fxpertise CRM";

  const subject = `[${fromName}] ${reportData.periodLabel} - ${formatDate(reportData.periodEnd)}`;
  const html = buildReportEmailHtml(reportData);
  const text = buildReportEmailText(reportData);

  if (!host || !user || !pass) {
    const errorMsg = `SMTP credentials (EMAIL_HOST, EMAIL_USER, EMAIL_PASS) are not configured. Simulated dispatch for ${recipient}.`;
    console.warn(`[email-report] ${errorMsg}`);

    await logEmailReport({
      reportType: period,
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "success",
      leadCount: reportData.stats.totalNewLeads,
      stageChangeCount: reportData.stats.totalStageChanges,
      confirmedCount: reportData.stats.totalConfirmed,
      periodStart: reportData.periodStart,
      periodEnd: reportData.periodEnd,
      error: errorMsg,
    });

    if (period === "daily") {
      await updateReportSettings({ lastDailySentAt: new Date().toISOString() });
    } else if (period === "weekly") {
      await updateReportSettings({ lastWeeklySentAt: new Date().toISOString() });
    }

    return {
      success: true,
      message: `Report compiled successfully. (SMTP simulated: credentials not configured)`,
      reportData,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to: recipient,
      subject,
      text,
      html,
    });

    console.log(`[email-report] Dispatched ${period} report to ${recipient} successfully.`);

    await logEmailReport({
      reportType: period,
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "success",
      leadCount: reportData.stats.totalNewLeads,
      stageChangeCount: reportData.stats.totalStageChanges,
      confirmedCount: reportData.stats.totalConfirmed,
      periodStart: reportData.periodStart,
      periodEnd: reportData.periodEnd,
    });

    if (period === "daily") {
      await updateReportSettings({ lastDailySentAt: new Date().toISOString() });
    } else if (period === "weekly") {
      await updateReportSettings({ lastWeeklySentAt: new Date().toISOString() });
    }

    return {
      success: true,
      message: `Report sent successfully to ${recipient}`,
      reportData,
    };
  } catch (err: any) {
    console.error("[email-report] Failed to send email report:", err);

    await logEmailReport({
      reportType: period,
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "failed",
      leadCount: reportData.stats.totalNewLeads,
      stageChangeCount: reportData.stats.totalStageChanges,
      confirmedCount: reportData.stats.totalConfirmed,
      periodStart: reportData.periodStart,
      periodEnd: reportData.periodEnd,
      error: err?.message || String(err),
    });

    return {
      success: false,
      message: `Failed to dispatch email report: ${err?.message || String(err)}`,
      reportData,
    };
  }
}
