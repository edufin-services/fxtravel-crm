import { NextRequest, NextResponse } from "next/server";
import { getAssignedLeadsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let leads = await getAssignedLeadsByOwner(session.userId);

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
  if (q) {
    leads = leads.filter((l) => l.name.toLowerCase().includes(q) || (l.phone && l.phone.includes(q)));
  }

  return NextResponse.json({ leads });
}
