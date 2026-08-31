import { NextRequest, NextResponse } from "next/server";
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

  // Authorization check: CRON_SECRET or query token or active admin session
  const expectedSecret = process.env.CRON_SECRET || process.env.GOOGLE_SHEETS_SYNC_TOKEN || "fx_cron_reports_2026";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  const isTokenValid = (bearerToken && bearerToken === expectedSecret) || (tokenParam && tokenParam === expectedSecret);
  const session = await getSession();
  const isAdmin = !!session?.isAdmin;

  if (!isTokenValid && !isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Bearer token or CRON secret." },
      { status: 401 }
    );
  }

  const results: any[] = [];

  if (periodParam === "all" || periodParam === "both") {
    const dailyRes = await sendActivityReportEmail({
      period: "daily",
      customRecipient: recipientParam,
    });
    const weeklyRes = await sendActivityReportEmail({
      period: "weekly",
      customRecipient: recipientParam,
    });
    results.push({ period: "daily", ...dailyRes }, { period: "weekly", ...weeklyRes });
  } else {
    const period = periodParam === "weekly" ? "weekly" : "daily";
    const res = await sendActivityReportEmail({
      period,
      customRecipient: recipientParam,
    });
    results.push({ period, ...res });
  }

  return NextResponse.json({
    success: true,
    dispatchedAt: new Date().toISOString(),
    results,
  });
}
