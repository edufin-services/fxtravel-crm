import { NextRequest, NextResponse } from "next/server";
import { deleteUser } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/admin/agents/[id]">) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  await deleteUser(id);
  return NextResponse.json({ success: true });
}
