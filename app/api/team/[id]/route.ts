import { NextRequest, NextResponse } from "next/server";
import { deleteTeamMember } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/team/[id]">) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  await deleteTeamMember(id, session.userId);
  return NextResponse.json({ success: true });
}
