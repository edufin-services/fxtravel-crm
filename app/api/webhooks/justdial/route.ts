import { NextRequest, NextResponse } from "next/server";
import { createLead, getAllUsers } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ status: "Justdial webhook active" });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = body.name || body.lead_name || "Justdial Lead";
    const phone = body.phone || body.mobile || body.contact || "";
    const email = body.email || "";
    const cleanPhone = String(phone).replace(/\D/g, "");

    const users = await getAllUsers();
    const owner = users[0];
    if (!owner) {
      return NextResponse.json({ error: "No user found to assign lead" }, { status: 400 });
    }

    const lead = await createLead({
      ownerId: owner.id,
      name: String(name),
      channel: "Justdial",
      value: 0,
      stage: "Initial",
      phone: cleanPhone || undefined,
      email: email || undefined,
      notes: `Ingested via Justdial Webhook: ${JSON.stringify(body)}`,
    });

    return NextResponse.json({ success: true, lead });
  } catch (err) {
    console.error("[webhooks/justdial] Error processing lead:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
