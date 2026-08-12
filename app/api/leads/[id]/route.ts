import { NextRequest, NextResponse } from "next/server";
import { STAGES } from "@/lib/constants";
import { deleteLead, getLeadById, getUserById, updateLead } from "@/lib/db";
import { EMAIL_STAGES, sendStageEmail } from "@/lib/email";
import { getSession } from "@/lib/session";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const {
    name, value, stage, email, phone, color, notes, services,
    city, state, neetStatus, preferredCountry, preferredUniversity1, preferredUniversity2, assignAgent, ownerId,
    firstPayment, secondPayment, thirdPaymentAmount, otcAmount, totalServiceCharge,
    companyName, designation, yearlyVolume, rateOfferedCN, rateOfferedCard, rateOfferedTTDD, nextFollowUp, feedback, clientVisitStatus,
  } = body ?? {};

  const updates: Partial<{
    name: string; value: number; stage: typeof STAGES[number];
    email: string; phone: string; color: string; notes: string; reminderAt: string; services: string[];
    city: string; state: string; neetStatus: string; preferredCountry: string;
    preferredUniversity1: string; preferredUniversity2: string; assignAgent: string; ownerId: string;
    firstPayment: number; secondPayment: number; thirdPaymentAmount: number;
    otcAmount: number; totalServiceCharge: number;
    companyName: string; designation: string; yearlyVolume: number;
    rateOfferedCN: number; rateOfferedCard: number; rateOfferedTTDD: number;
    nextFollowUp: string; feedback: string; clientVisitStatus: string;
  }> = {};

  if (body?.reminderAt !== undefined) {
    updates.reminderAt = typeof body.reminderAt === "string" ? body.reminderAt : "";
  }

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    updates.name = name.trim();
  }
  if (value !== undefined) {
    if (typeof value !== "number" || value < 0) return NextResponse.json({ error: "Invalid value." }, { status: 400 });
    updates.value = value;
  }
  if (email !== undefined) {
    updates.email = typeof email === "string" ? email.trim() : "";
  }
  if (phone !== undefined) {
    const digits = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
    if (phone && digits.length !== 10) {
      return NextResponse.json({ error: "Phone number must be exactly 10 digits." }, { status: 400 });
    }
    updates.phone = digits;
  }
  if (color !== undefined) {
    updates.color = typeof color === "string" ? color.trim() : "";
  }
  if (notes !== undefined) {
    updates.notes = typeof notes === "string" ? notes : "";
  }
  if (services !== undefined && Array.isArray(services)) {
    updates.services = services;
  }
  if (city !== undefined) updates.city = typeof city === "string" ? city.trim() : "";
  if (state !== undefined) updates.state = typeof state === "string" ? state.trim() : "";
  if (neetStatus !== undefined) updates.neetStatus = typeof neetStatus === "string" ? neetStatus.trim() : "";
  if (preferredCountry !== undefined) updates.preferredCountry = typeof preferredCountry === "string" ? preferredCountry.trim() : "";
  if (preferredUniversity1 !== undefined) updates.preferredUniversity1 = typeof preferredUniversity1 === "string" ? preferredUniversity1.trim() : "";
  if (preferredUniversity2 !== undefined) updates.preferredUniversity2 = typeof preferredUniversity2 === "string" ? preferredUniversity2.trim() : "";
  if (assignAgent !== undefined) updates.assignAgent = typeof assignAgent === "string" ? assignAgent.trim() : "";
  if (ownerId !== undefined) {
    if (typeof ownerId !== "string" || !ownerId.trim()) return NextResponse.json({ error: "Invalid agent." }, { status: 400 });
    if (ownerId !== session.userId && !await getUserById(ownerId)) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }
    updates.ownerId = ownerId;
  }
  if (firstPayment !== undefined && typeof firstPayment === "number") updates.firstPayment = firstPayment;
  if (secondPayment !== undefined && typeof secondPayment === "number") updates.secondPayment = secondPayment;
  if (thirdPaymentAmount !== undefined && typeof thirdPaymentAmount === "number") updates.thirdPaymentAmount = thirdPaymentAmount;
  if (otcAmount !== undefined && typeof otcAmount === "number") updates.otcAmount = otcAmount;
  if (totalServiceCharge !== undefined && typeof totalServiceCharge === "number") updates.totalServiceCharge = totalServiceCharge;

  if (companyName !== undefined) updates.companyName = typeof companyName === "string" ? companyName.trim() : "";
  if (designation !== undefined) updates.designation = typeof designation === "string" ? designation.trim() : "";
  if (yearlyVolume !== undefined) updates.yearlyVolume = Number(yearlyVolume) || 0;
  if (rateOfferedCN !== undefined) updates.rateOfferedCN = Number(rateOfferedCN) || 0;
  if (rateOfferedCard !== undefined) updates.rateOfferedCard = Number(rateOfferedCard) || 0;
  if (rateOfferedTTDD !== undefined) updates.rateOfferedTTDD = Number(rateOfferedTTDD) || 0;
  if (nextFollowUp !== undefined) updates.nextFollowUp = typeof nextFollowUp === "string" ? nextFollowUp : "";
  if (feedback !== undefined) updates.feedback = typeof feedback === "string" ? feedback : "";
  if (clientVisitStatus !== undefined) updates.clientVisitStatus = typeof clientVisitStatus === "string" ? clientVisitStatus : "Live";

  if (stage !== undefined) {
    if (!STAGES.includes(stage)) return NextResponse.json({ error: "Invalid stage." }, { status: 400 });

    // Fetch current lead to validate transition
    const current = await getLeadById(id, session.userId);
    if (!current) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    // No transition — skip all checks
    if (stage === current.stage) {
      updates.stage = stage;
      const lead = await updateLead(id, session.userId, updates);
      if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
      return NextResponse.json({ lead });
    }

    const currentIndex = STAGES.indexOf(current.stage);
    const newIndex = STAGES.indexOf(stage);

    // Only next stage allowed
    if (newIndex !== currentIndex + 1) {
      const nextStageName = STAGES[currentIndex + 1];
      return NextResponse.json(
        { error: nextStageName ? `You can only advance to "${nextStageName}" next.` : "This lead is already at the final stage." },
        { status: 400 }
      );
    }



    updates.stage = stage;
    const lead = await updateLead(id, session.userId, updates);
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    // Fire email (non-blocking)
    if (EMAIL_STAGES.has(stage) && lead.email) {
      sendStageEmail(lead.name, lead.email, stage).catch((err) =>
        console.error("[email] Stage email failed:", err)
      );
    }

    return NextResponse.json({ lead });
  }

  const lead = await updateLead(id, session.userId, updates);
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await deleteLead(id, session.userId);
  return NextResponse.json({ success: true });
}
