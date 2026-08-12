import { NextRequest, NextResponse } from "next/server";
import { setNotificationPrefs } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { label, enabled } = body ?? {};

  if (typeof label !== "string" || !label.trim() || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid notification update." }, { status: 400 });
  }

  const notificationPrefs = await setNotificationPrefs(session.userId, { [label]: enabled });
  return NextResponse.json({ notificationPrefs });
}
