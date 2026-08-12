import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getAllUsers, getUserByEmail } from "@/lib/db";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const agents = await getAllUsers();
  return NextResponse.json({ agents: agents.map((a) => ({ id: a.id, name: a.name, email: a.email, company: a.company, createdAt: a.createdAt })) });
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const { name, company, email, password } = body ?? {};

  if (
    typeof name !== "string" || !name.trim() ||
    typeof company !== "string" || !company.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof password !== "string" || password.length < 8
  ) {
    return NextResponse.json({ error: "All fields are required. Password must be at least 8 characters." }, { status: 400 });
  }

  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: "An agent with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const agent = await createUser({ name: name.trim(), company: company.trim(), email: email.trim(), passwordHash });

  return NextResponse.json({ agent: { id: agent.id, name: agent.name, email: agent.email, company: agent.company, createdAt: agent.createdAt } }, { status: 201 });
}
