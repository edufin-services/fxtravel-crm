import { NextRequest, NextResponse } from "next/server";
import { CHANNELS } from "@/lib/constants";
import { createContact, getContactsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contacts = await getContactsByOwner(session.userId);
  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { name, company, email, phone, channel, tags } = body ?? {};

  if (
    typeof name !== "string" || typeof company !== "string" ||
    typeof email !== "string" || typeof phone !== "string" ||
    !name.trim() || !company.trim() || !email.trim() || !phone.trim() ||
    !CHANNELS.includes(channel) ||
    (tags !== undefined && !Array.isArray(tags))
  ) {
    return NextResponse.json({ error: "Please fill in all fields with valid values." }, { status: 400 });
  }

  const contact = await createContact({
    ownerId: session.userId,
    name: name.trim(), company: company.trim(), email: email.trim(), phone: phone.trim(),
    channel, tags: Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [],
  });
  return NextResponse.json({ contact });
}
