import { NextRequest, NextResponse } from "next/server";
import { restoreLeadAdmin } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/admin/leads/[id]/restore">) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const lead = await restoreLeadAdmin(id);
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  return NextResponse.json({ lead });
}
