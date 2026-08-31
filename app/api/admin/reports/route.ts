import { NextRequest, NextResponse } from "next/server";
import { getEmailReportLogs, getReportSettings, updateReportSettings } from "@/lib/db";
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

  let preview = null;
  if (previewPeriod) {
    preview = await generateActivityReport(previewPeriod, {
      recipient: settings.customRecipientEmail || process.env.E_EMAIL || process.env.ADMIN_EMAIL || "admin@fxpertise.com",
    });
  }

  return NextResponse.json({
    settings,
    logs,
    preview,
    envRecipient: process.env.E_EMAIL || process.env.ADMIN_EMAIL || "",
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const period = body.period === "weekly" ? "weekly" : "daily";
  const customRecipient = typeof body.recipient === "string" && body.recipient.trim() ? body.recipient.trim() : undefined;

  const result = await sendActivityReportEmail({
    period,
    customRecipient,
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
  if (typeof body.customRecipientEmail === "string") updates.customRecipientEmail = body.customRecipientEmail.trim();

  const settings = await updateReportSettings(updates);
  return NextResponse.json({ success: true, settings });
}
