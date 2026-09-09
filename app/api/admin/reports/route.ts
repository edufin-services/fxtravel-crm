import { NextRequest, NextResponse } from "next/server";
import { getEmailReportLogs, getRecipientsFromSettings, getReportSettings, updateReportSettings } from "@/lib/db";
import { generateActivityReport, sendActivityReportEmail } from "@/lib/reports";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const previewPeriod = url.searchParams.get("preview") as "daily" | "weekly" | null;

  const [settings, logs] = await Promise.all([
    getReportSettings(),
    getEmailReportLogs(30),
  ]);

  const recipients = getRecipientsFromSettings(settings);
  const recipientStr = recipients.join(", ") || process.env.ADMIN_EMAIL || "admin@fxpertise.com";

  let preview = null;
  if (previewPeriod) {
    preview = await generateActivityReport(previewPeriod, {
      recipient: recipientStr,
    });
  }

  return NextResponse.json({
    settings,
    logs,
    preview,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const period = body.period === "weekly" ? "weekly" : "daily";

  let recipients: string[] | undefined = undefined;
  if (Array.isArray(body.recipients) && body.recipients.length > 0) {
    recipients = body.recipients.map((r: any) => String(r).trim()).filter(Boolean);
  } else if (typeof body.recipient === "string" && body.recipient.trim()) {
    recipients = body.recipient.split(",").map((r: string) => r.trim()).filter(Boolean);
  }

  const result = await sendActivityReportEmail({
    period,
    recipients,
    force: true,
  });

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, any> = {};

  if (typeof body.dailyEnabled === "boolean") updates.dailyEnabled = body.dailyEnabled;
  if (typeof body.weeklyEnabled === "boolean") updates.weeklyEnabled = body.weeklyEnabled;
  if (typeof body.dailyReportTime === "string") updates.dailyReportTime = body.dailyReportTime;
  if (typeof body.weeklyReportDay === "number") updates.weeklyReportDay = body.weeklyReportDay;

  if (Array.isArray(body.recipientEmails)) {
    const cleaned = body.recipientEmails
      .map((e: any) => String(e).trim().toLowerCase())
      .filter((e: string) => e.length > 0 && e.includes("@"));
    updates.recipientEmails = Array.from(new Set(cleaned));
    updates.customRecipientEmail = updates.recipientEmails.join(", ");
  } else if (typeof body.customRecipientEmail === "string") {
    const cleaned = body.customRecipientEmail
      .split(",")
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.length > 0 && e.includes("@"));
    updates.recipientEmails = Array.from(new Set(cleaned));
    updates.customRecipientEmail = updates.recipientEmails.join(", ");
  }

  const settings = await updateReportSettings(updates);
  return NextResponse.json({ success: true, settings });
}
