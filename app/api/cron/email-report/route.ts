import { NextRequest, NextResponse } from "next/server";
import { claimDailyCronSlot, claimWeeklyCronSlot, getRecipientsFromSettings, getReportSettings } from "@/lib/db";
import { sendActivityReportEmail } from "@/lib/reports";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  return handleReportCron(request);
}

export async function POST(request: NextRequest) {
  return handleReportCron(request);
}

async function handleReportCron(request: NextRequest) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") || "";
  const tokenParam = url.searchParams.get("token") || "";
  const periodParam = (url.searchParams.get("period") || "daily").toLowerCase();
  const recipientParam = url.searchParams.get("recipient") || undefined;
  const force = url.searchParams.get("force") === "true";

  // Authorization check: support CRON_SECRET, GOOGLE_SHEETS_SYNC_TOKEN, predefined tokens, or active admin session
  const validTokens = new Set(
    [
      process.env.CRON_SECRET,
      process.env.GOOGLE_SHEETS_SYNC_TOKEN,
      "fx_sheets_sync_2026",
      "fx_cron_reports_2026",
    ].filter(Boolean) as string[]
  );

  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const isTokenValid =
    (bearerToken && validTokens.has(bearerToken)) ||
    (tokenParam && validTokens.has(tokenParam));

  const session = await getSession();
  const isAdmin = !!session?.isAdmin;

  if (!isTokenValid && !isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Bearer token or CRON secret." },
      { status: 401 }
    );
  }

  const settings = await getReportSettings();
  const configuredRecipients = getRecipientsFromSettings(settings);

  // Today in Asia/Kolkata (IST)
  const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayIstDate = istDateFormatter.format(new Date());

  const results: any[] = [];

  const shouldSendDaily = periodParam === "all" || periodParam === "both" || periodParam === "daily";
  const shouldSendWeekly = periodParam === "all" || periodParam === "both" || periodParam === "weekly";

  if (shouldSendDaily) {
    let dailyRes: any = { skipped: true, reason: "Already dispatched today" };
    if (!settings.dailyEnabled && !force) {
      dailyRes = { skipped: true, reason: "Daily reports are disabled in settings" };
    } else if (force || (await claimDailyCronSlot(todayIstDate))) {
      dailyRes = await sendActivityReportEmail({
        period: "daily",
        customRecipient: recipientParam,
        recipients: recipientParam ? undefined : (configuredRecipients.length > 0 ? configuredRecipients : undefined),
        isScheduledCron: true,
      });
    }
    results.push({ period: "daily", ...dailyRes });
  }

  if (shouldSendWeekly) {
    let weeklyRes: any = { skipped: true, reason: "Already dispatched this week" };
    if (!settings.weeklyEnabled && !force) {
      weeklyRes = { skipped: true, reason: "Weekly reports are disabled in settings" };
    } else if (force || (await claimWeeklyCronSlot(todayIstDate))) {
      weeklyRes = await sendActivityReportEmail({
        period: "weekly",
        customRecipient: recipientParam,
        recipients: recipientParam ? undefined : (configuredRecipients.length > 0 ? configuredRecipients : undefined),
        isScheduledCron: true,
      });
    }
    results.push({ period: "weekly", ...weeklyRes });
  }

  return NextResponse.json({
    success: true,
    dispatchedAt: new Date().toISOString(),
    results,
  });
}
