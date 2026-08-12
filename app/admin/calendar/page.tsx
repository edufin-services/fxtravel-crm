import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CalendarPage from "@/app/dashboard/calendar/page";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  return <CalendarPage />;
}
