import { NextRequest, NextResponse } from "next/server";
import { markConversationRead } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/conversations/[id]">) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (body?.unread === 0) {
    await markConversationRead(id, session.userId);
  }

  return NextResponse.json({ success: true });
}
