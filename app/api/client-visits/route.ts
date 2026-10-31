import { NextRequest, NextResponse } from "next/server";
import { CLIENT_VISIT_STAGES } from "@/lib/constants";
import { createLead, getAllClientVisits, getClientVisitsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visits = session.isAdmin
    ? await getAllClientVisits()
    : await getClientVisitsByOwner(session.userId);

  return NextResponse.json({ clientVisits: visits });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const {
    name,
    companyName,
    designation,
    phone,
    email,
    yearlyVolume,
    rateOfferedCN,
    rateOfferedCard,
    rateOfferedTTDD,
    nextFollowUp,
    feedback,
    clientVisitStatus,
    ownerId,
    assignedBranchId,
    assignedBranchName,
    notes,
  } = body ?? {};

  const cleanPhone = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
  }

  const targetOwnerId = session.isAdmin && ownerId ? ownerId : session.userId;
  const targetStatus = (CLIENT_VISIT_STAGES as readonly string[]).includes(clientVisitStatus)
    ? clientVisitStatus
    : "Live";

  const volumeNum = Number(yearlyVolume) || 0;

  const lead = await createLead({
    ownerId: targetOwnerId,
    isClientVisit: true,
    name: name.trim(),
    companyName: typeof companyName === "string" ? companyName.trim() : "",
    designation: typeof designation === "string" ? designation.trim() : "",
    phone: cleanPhone,
    email: typeof email === "string" ? email.trim() : "",
    channel: "Referral/Others",
    stage: "Initial",
    value: volumeNum,
    yearlyVolume: volumeNum,
    rateOfferedCN: Number(rateOfferedCN) || 0,
    rateOfferedCard: Number(rateOfferedCard) || 0,
    rateOfferedTTDD: Number(rateOfferedTTDD) || 0,
    nextFollowUp: typeof nextFollowUp === "string" ? nextFollowUp : "",
    feedback: typeof feedback === "string" ? feedback : "",
    clientVisitStatus: targetStatus,
    assignedBranchId: typeof assignedBranchId === "string" ? assignedBranchId : undefined,
    assignedBranchName: typeof assignedBranchName === "string" ? assignedBranchName : undefined,
    notes: typeof notes === "string" ? notes : "",
    services: ["Corporate Client Visit"],
  });

  return NextResponse.json({ clientVisit: lead });
}
