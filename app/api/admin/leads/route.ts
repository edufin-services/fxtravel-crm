import { NextRequest, NextResponse } from "next/server";
import { CHANNELS, STAGES } from "@/lib/constants";
import { createLead, getAllLeads, getLeadsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = request.nextUrl.searchParams.get("ownerId");
  let leads = ownerId ? await getLeadsByOwner(ownerId) : await getAllLeads();

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  if (q) {
    leads = leads.filter((l) => l.name.toLowerCase().includes(q) || (l.phone && l.phone.includes(q)));
  }

  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { ownerId, name, channel, stage, phone, services, notes } = body ?? {};
  const cleanPhone = typeof phone === "string" ? phone.replace(/\D/g, "") : "";

  if (
    !ownerId || typeof ownerId !== "string" ||
    typeof name !== "string" || !name.trim() ||
    !CHANNELS.includes(channel) ||
    !STAGES.includes(stage) ||
    cleanPhone.length !== 10
  ) {
    return NextResponse.json({ error: "Please enter a valid agent, name, channel, stage, and 10-digit phone number." }, { status: 400 });
  }

  const lead = await createLead({
    ownerId,
    name: name.trim(),
    channel,
    value: 0,
    stage,
    phone: cleanPhone,
    services: Array.isArray(services) ? services : [],
    notes: typeof notes === "string" ? notes : "",
  });

  return NextResponse.json({ lead });
}
