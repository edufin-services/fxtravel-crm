import { NextRequest, NextResponse } from "next/server";
import { CHANNELS } from "@/lib/constants";
import { deleteContact, updateContact } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/contacts/[id]">) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const { name, company, email, phone, channel, tags } = body ?? {};
  const updates: Partial<{ name: string; company: string; email: string; phone: string; channel: typeof CHANNELS[number]; tags: string[] }> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    updates.name = name.trim();
  }
  if (company !== undefined) {
    if (typeof company !== "string" || !company.trim()) return NextResponse.json({ error: "Invalid company." }, { status: 400 });
    updates.company = company.trim();
  }
  if (email !== undefined) {
    if (typeof email !== "string" || !email.trim()) return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    updates.email = email.trim();
  }
  if (phone !== undefined) {
    if (typeof phone !== "string" || !phone.trim()) return NextResponse.json({ error: "Invalid phone." }, { status: 400 });
    updates.phone = phone.trim();
  }
  if (channel !== undefined) {
    if (!CHANNELS.includes(channel)) return NextResponse.json({ error: "Invalid channel." }, { status: 400 });
    updates.channel = channel;
  }
  if (tags !== undefined) {
    if (!Array.isArray(tags)) return NextResponse.json({ error: "Invalid tags." }, { status: 400 });
    updates.tags = tags.filter((t) => typeof t === "string");
  }

  const contact = await updateContact(id, session.userId, updates);
  if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });

  return NextResponse.json({ contact });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/contacts/[id]">) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await deleteContact(id, session.userId);
  return NextResponse.json({ success: true });
}
