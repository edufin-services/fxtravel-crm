import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getAllUsers, getUserByEmail } from "@/lib/db";
import { getSession } from "@/lib/session";
import { DEFAULT_USER_PASSWORD } from "@/lib/constants";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const agents = await getAllUsers();
  return NextResponse.json({
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      company: a.company,
      branchId: a.branchId || (a.email?.toLowerCase().includes("mouparna") || a.name?.toLowerCase().includes("mouparna") ? "br-kolkata-01" : "br-delhi-01"),
      branchName: a.branchName || (a.email?.toLowerCase().includes("mouparna") || a.name?.toLowerCase().includes("mouparna") ? "Kolkata Branch" : "Delhi NCR Branch"),
      createdAt: a.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const { name, company, email, password, branchId, branchName } = body ?? {};

  if (
    typeof name !== "string" || !name.trim() ||
    typeof company !== "string" || !company.trim() ||
    typeof email !== "string" || !email.trim()
  ) {
    return NextResponse.json({ error: "Name, company, and email are required." }, { status: 400 });
  }

  const effectivePassword = typeof password === "string" && password.trim() ? password.trim() : DEFAULT_USER_PASSWORD;
  if (effectivePassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  if (await getUserByEmail(email.trim())) {
    return NextResponse.json({ error: "An agent with this email already exists." }, { status: 409 });
  }

  const finalBranchId = branchId || (branchName?.toLowerCase().includes("kolkata") ? "br-kolkata-01" : "br-delhi-01");
  const finalBranchName = branchName || (finalBranchId === "br-kolkata-01" ? "Kolkata Branch" : "Delhi NCR Branch");

  const passwordHash = await bcrypt.hash(effectivePassword, 10);
  const agent = await createUser({
    name: name.trim(),
    company: company.trim(),
    email: email.trim(),
    branchId: finalBranchId,
    branchName: finalBranchName,
    passwordHash,
  });

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      company: agent.company,
      branchId: agent.branchId,
      branchName: agent.branchName,
      createdAt: agent.createdAt,
    },
  }, { status: 201 });
}
