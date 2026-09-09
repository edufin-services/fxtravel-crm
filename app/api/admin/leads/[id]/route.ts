import { NextRequest, NextResponse } from "next/server";
import { STAGES } from "@/lib/constants";
import { deleteLeadAdmin, getLeadByIdAdmin, getUserById, updateLeadAdmin } from "@/lib/db";
import { EMAIL_STAGES, sendStageEmail } from "@/lib/email";
import { getSession } from "@/lib/session";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/leads/[id]">) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await getLeadByIdAdmin(id);
  if (!existing) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const {
    name, value, stage, email, phone, color, notes, services, reminderAt,
    city, state, neetStatus, preferredCountry, preferredUniversity1, preferredUniversity2, assignAgent, ownerId,
    assignedBranchId, assignedBranchName, formNotes,
    firstPayment, secondPayment, thirdPaymentAmount, otcAmount, totalServiceCharge,
    companyName, designation, yearlyVolume, rateOfferedCN, rateOfferedCard, rateOfferedTTDD, nextFollowUp, feedback, clientVisitStatus,
  } = body ?? {};

  const updates: Record<string, any> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    updates.name = name.trim();
  }
  if (value !== undefined) {
    if (typeof value !== "number" || value < 0) return NextResponse.json({ error: "Invalid value." }, { status: 400 });
    updates.value = value;
  }
  if (stage !== undefined) {
    if (!STAGES.includes(stage)) return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    updates.stage = stage;
  }
  if (email !== undefined) updates.email = typeof email === "string" ? email.trim() : "";
  if (phone !== undefined) {
    const rawDigits = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
    const digits = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;
    if (digits && digits.length !== 10) {
      return NextResponse.json({ error: "Phone number must be exactly 10 digits." }, { status: 400 });
    }
    updates.phone = digits;
  }
  if (color !== undefined) updates.color = typeof color === "string" ? color.trim() : "";
  if (notes !== undefined) updates.notes = typeof notes === "string" ? notes : "";
  if (formNotes !== undefined) updates.formNotes = typeof formNotes === "string" ? formNotes : "";
  if (reminderAt !== undefined) updates.reminderAt = typeof reminderAt === "string" ? reminderAt : null;
  if (services !== undefined && Array.isArray(services)) updates.services = services;
  if (city !== undefined) updates.city = typeof city === "string" ? city.trim() : "";
  if (assignedBranchId !== undefined) updates.assignedBranchId = typeof assignedBranchId === "string" ? assignedBranchId.trim() : "";
  if (assignedBranchName !== undefined) updates.assignedBranchName = typeof assignedBranchName === "string" ? assignedBranchName.trim() : "";
  if (state !== undefined) updates.state = typeof state === "string" ? state.trim() : "";
  if (neetStatus !== undefined) updates.neetStatus = typeof neetStatus === "string" ? neetStatus.trim() : "";
  if (preferredCountry !== undefined) updates.preferredCountry = typeof preferredCountry === "string" ? preferredCountry.trim() : "";
  if (preferredUniversity1 !== undefined) updates.preferredUniversity1 = typeof preferredUniversity1 === "string" ? preferredUniversity1.trim() : "";
  if (preferredUniversity2 !== undefined) updates.preferredUniversity2 = typeof preferredUniversity2 === "string" ? preferredUniversity2.trim() : "";

  // Only assign agent if it is a real agent name and not "__admin__"
  if (assignAgent !== undefined && assignAgent !== "Admin") {
    updates.assignAgent = typeof assignAgent === "string" ? assignAgent.trim() : "";
  }

  // If ownerId is provided and not "__admin__", reassign to that agent.
  // If ownerId is "__admin__" or empty, preserve existing ownerId without erroring.
  if (ownerId !== undefined && ownerId !== "__admin__" && ownerId !== "") {
    if (typeof ownerId !== "string" || !ownerId.trim()) return NextResponse.json({ error: "Invalid agent." }, { status: 400 });
    const targetUser = await getUserById(ownerId);
    if (!targetUser) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    updates.ownerId = ownerId;
    if (!updates.assignAgent) updates.assignAgent = targetUser.name;
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

  const lead = await updateLeadAdmin(id, updates);
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  // Fire stage email if stage transitioned (non-blocking)
  if (stage && EMAIL_STAGES.has(stage) && lead.email) {
    sendStageEmail(lead.name, lead.email, stage).catch((err) =>
      console.error("[email] Admin stage email failed:", err)
    );
  }

  return NextResponse.json({ lead });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/admin/leads/[id]">) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const lead = await deleteLeadAdmin(id);
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
