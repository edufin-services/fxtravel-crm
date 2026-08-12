import { NextRequest, NextResponse } from "next/server";
import { CLIENT_VISIT_STAGES } from "@/lib/constants";
import { deleteLead, getLeadById, updateLead } from "@/lib/db";
import { getSession } from "@/lib/session";

type RouteContext<T extends string> = { params: Promise<Record<string, string>> };

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/client-visits/[id]">) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const {
    name, email, phone, notes,
    companyName, designation, yearlyVolume,
    rateOfferedCN, rateOfferedCard, rateOfferedTTDD,
    nextFollowUp, feedback, clientVisitStatus, stage,
  } = body ?? {};

  const targetVisitStatus = (CLIENT_VISIT_STAGES as readonly string[]).includes(clientVisitStatus)
    ? clientVisitStatus
    : (CLIENT_VISIT_STAGES as readonly string[]).includes(stage)
    ? stage
    : undefined;

  const updates: Partial<{
    name: string; email: string; phone: string; notes: string;
    companyName: string; designation: string; yearlyVolume: number;
    rateOfferedCN: number; rateOfferedCard: number; rateOfferedTTDD: number;
    nextFollowUp: string; feedback: string; clientVisitStatus: string; value: number;
  }> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    updates.name = name.trim();
  }
  if (email !== undefined) updates.email = typeof email === "string" ? email.trim() : "";
  if (phone !== undefined) {
    const digits = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
    if (phone && digits.length !== 10) return NextResponse.json({ error: "Phone number must be 10 digits." }, { status: 400 });
    updates.phone = digits;
  }
  if (companyName !== undefined) updates.companyName = typeof companyName === "string" ? companyName.trim() : "";
  if (designation !== undefined) updates.designation = typeof designation === "string" ? designation.trim() : "";
  if (yearlyVolume !== undefined) {
    const val = Number(yearlyVolume) || 0;
    updates.yearlyVolume = val;
    updates.value = val;
  }
  if (rateOfferedCN !== undefined) updates.rateOfferedCN = Number(rateOfferedCN) || 0;
  if (rateOfferedCard !== undefined) updates.rateOfferedCard = Number(rateOfferedCard) || 0;
  if (rateOfferedTTDD !== undefined) updates.rateOfferedTTDD = Number(rateOfferedTTDD) || 0;
  if (nextFollowUp !== undefined) updates.nextFollowUp = typeof nextFollowUp === "string" ? nextFollowUp : "";
  if (feedback !== undefined) updates.feedback = typeof feedback === "string" ? feedback : "";
  if (notes !== undefined) updates.notes = typeof notes === "string" ? notes : "";
  if (targetVisitStatus !== undefined) updates.clientVisitStatus = targetVisitStatus;

  const updated = await updateLead(id, session.userId, updates);
  if (!updated) return NextResponse.json({ error: "Client Visit record not found." }, { status: 404 });

  return NextResponse.json({ clientVisit: updated });
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/client-visits/[id]">) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const lead = await getLeadById(id, session.userId);
  if (!lead) return NextResponse.json({ error: "Client Visit record not found." }, { status: 404 });

  await deleteLead(id, session.userId);
  return NextResponse.json({ success: true });
}
