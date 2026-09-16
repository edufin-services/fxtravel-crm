import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { deleteUser, getUserById, getUserByEmail, updateUser } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/admin/agents/[id]">) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  await deleteUser(id);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/agents/[id]">) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await getUserById(id);
  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const { name, company, email, password, branchId, branchName } = body ?? {};

  const updates: {
    name?: string;
    company?: string;
    email?: string;
    passwordHash?: string;
    branchId?: string;
    branchName?: string;
  } = {};

  if (typeof name === "string") {
    if (!name.trim()) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }
    updates.name = name.trim();
  }

  if (typeof company === "string") {
    if (!company.trim()) {
      return NextResponse.json({ error: "Company cannot be empty." }, { status: 400 });
    }
    updates.company = company.trim();
  }

  if (typeof branchId === "string" && branchId.trim()) {
    updates.branchId = branchId.trim();
    updates.branchName = branchName?.trim() || (branchId === "br-kolkata-01" ? "Kolkata Branch" : "Delhi NCR Branch");
  } else if (typeof branchName === "string" && branchName.trim()) {
    updates.branchName = branchName.trim();
    updates.branchId = branchName.toLowerCase().includes("kolkata") ? "br-kolkata-01" : "br-delhi-01";
  }

  if (typeof email === "string") {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      return NextResponse.json({ error: "Email cannot be empty." }, { status: 400 });
    }
    const existingWithEmail = await getUserByEmail(trimmedEmail);
    if (existingWithEmail && existingWithEmail.id !== id) {
      return NextResponse.json({ error: "Another user with this email already exists." }, { status: 409 });
    }
    updates.email = trimmedEmail;
  }

  if (typeof password === "string" && password.trim().length > 0) {
    if (password.trim().length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    updates.passwordHash = await bcrypt.hash(password.trim(), 10);
  }

  const updatedUser = await updateUser(id, updates);
  if (!updatedUser) {
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }

  return NextResponse.json({
    agent: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      company: updatedUser.company,
      branchId: updatedUser.branchId,
      branchName: updatedUser.branchName,
      createdAt: updatedUser.createdAt,
    },
  });
}
