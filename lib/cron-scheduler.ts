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

    // Convert current time to IST (Asia/Kolkata)
    const istTimeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      weekday: "short",
    });

    const parts = istTimeFormatter.formatToParts(now);
    const currentHour = Number(parts.find((p) => p.type === "hour")?.value || "0");
    const currentMinute = Number(parts.find((p) => p.type === "minute")?.value || "0");
    const currentDayOfWeek = now.getDay(); // 0 is Sunday

    const [targetHour, targetMinute] = (settings.dailyReportTime || "20:00")
      .split(":")
      .map((n) => Number(n) || 0);

    // 1. Check Daily Report
    if (settings.dailyEnabled) {
      const lastDaily = settings.lastDailySentAt ? new Date(settings.lastDailySentAt).getTime() : 0;
      const hoursSinceLastDaily = (now.getTime() - lastDaily) / (1000 * 60 * 60);

      // Trigger if not sent in last 20 hours AND current IST time is past scheduled hour
      const isPastDailyTime = currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute);

      if (hoursSinceLastDaily >= 20 && isPastDailyTime) {
        console.log("[cron-scheduler] Daily report is due. Dispatching...");
        await sendActivityReportEmail({
          period: "daily",
          customRecipient: settings.customRecipientEmail || undefined,
        });
      }
    }

    // 2. Check Weekly Report
    if (settings.weeklyEnabled) {
      const lastWeekly = settings.lastWeeklySentAt ? new Date(settings.lastWeeklySentAt).getTime() : 0;
      const daysSinceLastWeekly = (now.getTime() - lastWeekly) / (1000 * 60 * 60 * 24);

      // Trigger if not sent in last 6 days AND it is the scheduled day (e.g. Sunday) AND past target time
      const isTargetDay = currentDayOfWeek === (settings.weeklyReportDay ?? 0);
      const isPastTargetTime = currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute);

      if (daysSinceLastWeekly >= 6 && isTargetDay && isPastTargetTime) {
        console.log("[cron-scheduler] Weekly report is due. Dispatching...");
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
