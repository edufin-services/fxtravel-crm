import { NextRequest, NextResponse } from "next/server";
import { restoreLead } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/leads/[id]/restore">) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const lead = await restoreLead(id, session.userId);
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  return NextResponse.json({ lead });
}
