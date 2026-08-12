import { NextResponse } from "next/server";
import { markNotificationsRead } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notificationsReadAt = await markNotificationsRead(session.userId);
  return NextResponse.json({ notificationsReadAt });
}
