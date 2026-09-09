import "server-only";
import { claimDailyCronSlot, claimWeeklyCronSlot, getRecipientsFromSettings, getReportSettings } from "./db";
import { sendActivityReportEmail } from "./reports";

const globalScheduler = globalThis as unknown as {
  __reportSchedulerInterval?: NodeJS.Timeout;
  __reportSchedulerRunning?: boolean;
};

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

    const scheduledTime = settings.dailyReportTime || "20:00";
    const [targetHour, targetMinute] = scheduledTime.split(":").map((n) => Number(n) || 0);

    const isPastScheduledTime =
      currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute);

    const recipients = getRecipientsFromSettings(settings);

    // 2. Check Daily Report:
    // Dispatches once per scheduled time slot (e.g. 2026-09-09_20:00) using atomic DB claim
    if (settings.dailyEnabled && isPastScheduledTime) {
      const dailySlotKey = `${todayIstDate}_${scheduledTime}`;
      const claimed = await claimDailyCronSlot(dailySlotKey);
      if (claimed) {
        console.log(
          `[cron-scheduler] Scheduled daily report claimed for slot ${dailySlotKey}. Dispatching to ${recipients.length} recipients...`
        );
        await sendActivityReportEmail({
          period: "daily",
          recipients: recipients.length > 0 ? recipients : undefined,
          isScheduledCron: true,
        });
      }
    }

    // 3. Check Weekly Report:
    // Dispatches once per designated day (default Sunday = 0) on or after scheduled time
    if (settings.weeklyEnabled) {
      const targetDay = settings.weeklyReportDay ?? 0;
      const isTargetDay = istDayOfWeek === targetDay;

      if (isTargetDay && isPastScheduledTime) {
        const weeklySlotKey = `${todayIstDate}_${scheduledTime}`;
        const claimed = await claimWeeklyCronSlot(weeklySlotKey);
        if (claimed) {
          console.log(
            `[cron-scheduler] Scheduled weekly report claimed for slot ${weeklySlotKey}. Dispatching to ${recipients.length} recipients...`
          );
          await sendActivityReportEmail({
            period: "weekly",
            recipients: recipients.length > 0 ? recipients : undefined,
            isScheduledCron: true,
          });
        }
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
  if (globalScheduler.__reportSchedulerRunning) return;
  globalScheduler.__reportSchedulerRunning = true;

  console.log("[cron-scheduler] Initializing automated daily & weekly report scheduler (30s interval)...");

  // Run initial check after 2 seconds
  setTimeout(() => {
    checkAndDispatchScheduledReports().catch((err) =>
      console.error("[cron-scheduler] Initial check error:", err)
    );
  }, 2000);

  // Check every 30 seconds for precise schedule alignment
  if (globalScheduler.__reportSchedulerInterval) {
    clearInterval(globalScheduler.__reportSchedulerInterval);
  }
  globalScheduler.__reportSchedulerInterval = setInterval(() => {
    checkAndDispatchScheduledReports().catch((err) =>
      console.error("[cron-scheduler] Interval check error:", err)
    );
  }, 30 * 1000);

  if (globalScheduler.__reportSchedulerInterval?.unref) {
    globalScheduler.__reportSchedulerInterval.unref();
  }
}
