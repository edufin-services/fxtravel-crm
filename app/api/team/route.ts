import { NextRequest, NextResponse } from "next/server";
import { createTeamMember, getTeamMembers } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamMembers = await getTeamMembers(session.userId);
  return NextResponse.json({ teamMembers });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name, email, role } = body ?? {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof role !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !role.trim()
  ) {
    return NextResponse.json({ error: "Please fill in all fields with valid values." }, { status: 400 });
  }

  const member = await createTeamMember({ ownerId: session.userId, name: name.trim(), email: email.trim(), role: role.trim() });
  return NextResponse.json({ member });
}
