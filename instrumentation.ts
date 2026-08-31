export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initReportScheduler } = await import("@/lib/cron-scheduler");
    initReportScheduler();
  }
}
