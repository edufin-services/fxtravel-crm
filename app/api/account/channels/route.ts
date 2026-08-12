import { NextRequest, NextResponse } from "next/server";
import { setUserChannel } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { channel, connected } = body ?? {};

  if (typeof channel !== "string" || !channel.trim() || typeof connected !== "boolean") {
    return NextResponse.json({ error: "Invalid channel update." }, { status: 400 });
  }

  const channels = await setUserChannel(session.userId, channel, connected);
  return NextResponse.json({ channels });
}
