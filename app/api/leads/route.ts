import { NextRequest, NextResponse } from "next/server";
import { CHANNELS, STAGES } from "@/lib/constants";
import { createLead, getAllLeads, getLeadsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId && !session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let leads = session.isAdmin ? await getAllLeads() : await getLeadsByOwner(session.userId!);

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
  if (q) {
    leads = leads.filter((l) => l.name.toLowerCase().includes(q));
  }

  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const {
    name, channel, stage, phone, services, notes, email,
    companyName, designation, yearlyVolume, rateOfferedCN, rateOfferedCard, rateOfferedTTDD, nextFollowUp, feedback, clientVisitStatus,
  } = body ?? {};
  const cleanPhone = typeof phone === "string" ? phone.replace(/\D/g, "") : "";

  if (
    typeof name !== "string" || !name.trim() ||
    !CHANNELS.includes(channel) ||
    !STAGES.includes(stage) ||
    cleanPhone.length !== 10
  ) {
    return NextResponse.json({ error: "Please enter a valid name, channel, stage, and 10-digit phone number." }, { status: 400 });
  }

  const lead = await createLead({
    ownerId: session.userId,
    name: name.trim(),
    channel,
    value: 0,
    stage,
    phone: cleanPhone,
    email: typeof email === "string" ? email.trim() : undefined,
    services: Array.isArray(services) ? services : [],
    notes: typeof notes === "string" ? notes : "",
    companyName: typeof companyName === "string" ? companyName.trim() : undefined,
    designation: typeof designation === "string" ? designation.trim() : undefined,
    yearlyVolume: typeof yearlyVolume === "number" ? yearlyVolume : Number(yearlyVolume) || 0,
    rateOfferedCN: typeof rateOfferedCN === "number" ? rateOfferedCN : Number(rateOfferedCN) || 0,
    rateOfferedCard: typeof rateOfferedCard === "number" ? rateOfferedCard : Number(rateOfferedCard) || 0,
    rateOfferedTTDD: typeof rateOfferedTTDD === "number" ? rateOfferedTTDD : Number(rateOfferedTTDD) || 0,
    nextFollowUp: typeof nextFollowUp === "string" ? nextFollowUp : undefined,
    feedback: typeof feedback === "string" ? feedback : undefined,
    clientVisitStatus: typeof clientVisitStatus === "string" ? clientVisitStatus : "Live",
  });
  return NextResponse.json({ lead });
}
