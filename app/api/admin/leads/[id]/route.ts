import { NextRequest, NextResponse } from "next/server";
import { STAGES } from "@/lib/constants";
import { deleteLeadAdmin, getLeadByIdAdmin, getUserById, updateLeadAdmin } from "@/lib/db";
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
    firstPayment, secondPayment, thirdPaymentAmount, otcAmount, totalServiceCharge,
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
    const digits = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
    if (phone && digits.length !== 10) {
      return NextResponse.json({ error: "Phone number must be exactly 10 digits." }, { status: 400 });
    }
    updates.phone = digits;
  }
  if (color !== undefined) updates.color = typeof color === "string" ? color.trim() : "";
  if (notes !== undefined) updates.notes = typeof notes === "string" ? notes : "";
  if (reminderAt !== undefined) updates.reminderAt = typeof reminderAt === "string" ? reminderAt : null;
  if (services !== undefined && Array.isArray(services)) updates.services = services;
  if (city !== undefined) updates.city = typeof city === "string" ? city.trim() : "";
  if (state !== undefined) updates.state = typeof state === "string" ? state.trim() : "";
  if (neetStatus !== undefined) updates.neetStatus = typeof neetStatus === "string" ? neetStatus.trim() : "";
  if (preferredCountry !== undefined) updates.preferredCountry = typeof preferredCountry === "string" ? preferredCountry.trim() : "";
  if (preferredUniversity1 !== undefined) updates.preferredUniversity1 = typeof preferredUniversity1 === "string" ? preferredUniversity1.trim() : "";
  if (preferredUniversity2 !== undefined) updates.preferredUniversity2 = typeof preferredUniversity2 === "string" ? preferredUniversity2.trim() : "";
  if (assignAgent !== undefined) updates.assignAgent = typeof assignAgent === "string" ? assignAgent.trim() : "";

  if (ownerId !== undefined) {
    if (typeof ownerId !== "string" || !ownerId.trim()) return NextResponse.json({ error: "Invalid agent." }, { status: 400 });
    if (!await getUserById(ownerId)) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    updates.ownerId = ownerId;
  }

  if (firstPayment !== undefined && typeof firstPayment === "number") updates.firstPayment = firstPayment;
  if (secondPayment !== undefined && typeof secondPayment === "number") updates.secondPayment = secondPayment;
  if (thirdPaymentAmount !== undefined && typeof thirdPaymentAmount === "number") updates.thirdPaymentAmount = thirdPaymentAmount;
  if (otcAmount !== undefined && typeof otcAmount === "number") updates.otcAmount = otcAmount;
  if (totalServiceCharge !== undefined && typeof totalServiceCharge === "number") updates.totalServiceCharge = totalServiceCharge;

  const lead = await updateLeadAdmin(id, updates);
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
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
