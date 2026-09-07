import "server-only";
import { getReportSettings } from "./db";
import { sendActivityReportEmail } from "./reports";

let isSchedulerRunning = false;
let intervalHandle: NodeJS.Timeout | null = null;

/**
 * Checks if daily or weekly digest reports are due and dispatches them
 */
export async function checkAndDispatchScheduledReports(): Promise<void> {
  try {
    const settings = await getReportSettings();
    const now = new Date();

    // 1. Get current date & time in IST (Asia/Kolkata)
    const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayIstDate = istDateFormatter.format(now); // "YYYY-MM-DD"
    const istDayOfWeek = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getDay(); // 0 = Sunday

    const istTimeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = istTimeFormatter.formatToParts(now);
    const currentHour = Number(parts.find((p) => p.type === "hour")?.value || "0");
    const currentMinute = Number(parts.find((p) => p.type === "minute")?.value || "0");

    const [targetHour, targetMinute] = (settings.dailyReportTime || "20:00")
      .split(":")
      .map((n) => Number(n) || 0);

    const isPastScheduledTime =
      currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute);

    // 2. Check Daily Report:
    // Only dispatch on or after scheduled time (e.g. 20:00 IST),
    // and strictly once per calendar day (todayIstDate !== lastDailyDate)
    if (settings.dailyEnabled) {
      const lastDailyDate = settings.lastDailySentAt
        ? istDateFormatter.format(new Date(settings.lastDailySentAt))
        : "";

      const alreadySentToday = lastDailyDate === todayIstDate;

      if (isPastScheduledTime && !alreadySentToday) {
        console.log(
          `[cron-scheduler] Scheduled daily report is due for ${todayIstDate} at ${settings.dailyReportTime || "20:00"} IST. Dispatching...`
        );
        await sendActivityReportEmail({
          period: "daily",
          customRecipient: settings.customRecipientEmail || undefined,
        });
      }
    }

    // 3. Check Weekly Report:
    // Only dispatch on the designated day (default Sunday = 0) on or after scheduled time,
    // and strictly once per weekly cycle
    if (settings.weeklyEnabled) {
      const targetDay = settings.weeklyReportDay ?? 0;
      const isTargetDay = istDayOfWeek === targetDay;

      const lastWeeklyDate = settings.lastWeeklySentAt
        ? istDateFormatter.format(new Date(settings.lastWeeklySentAt))
        : "";
      const lastWeeklyTime = settings.lastWeeklySentAt
        ? new Date(settings.lastWeeklySentAt).getTime()
        : 0;
      const daysSinceLastWeekly = lastWeeklyTime
        ? (now.getTime() - lastWeeklyTime) / (1000 * 60 * 60 * 24)
        : Infinity;

      const alreadySentThisWeek =
        lastWeeklyDate === todayIstDate || daysSinceLastWeekly < 5;

      if (isTargetDay && isPastScheduledTime && !alreadySentThisWeek) {
        console.log(
          `[cron-scheduler] Scheduled weekly report is due for day ${targetDay} at ${settings.dailyReportTime || "20:00"} IST. Dispatching...`
        );
        await sendActivityReportEmail({
          period: "weekly",
          customRecipient: settings.customRecipientEmail || undefined,
        });
      }
    }
  } catch (err) {
    console.error("[cron-scheduler] Error in scheduled report loop:", err);
  }
}

/**
 * Initializes the in-process background scheduler interval
 */
export function initReportScheduler(): void {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  console.log("[cron-scheduler] Initializing automated daily & weekly report scheduler...");

  // Run initial check after 10 seconds (gives server time to start)
  setTimeout(() => {
    checkAndDispatchScheduledReports().catch((err) =>
      console.error("[cron-scheduler] Initial check error:", err)
    );
  }, 10000);

  // Check every 5 minutes (300,000 ms)
  intervalHandle = setInterval(() => {
    checkAndDispatchScheduledReports().catch((err) =>
      console.error("[cron-scheduler] Interval check error:", err)
    );
  }, 5 * 60 * 1000);

  // Unref interval so it doesn't block process exit if necessary
  if (intervalHandle?.unref) {
    intervalHandle.unref();
  }
}
