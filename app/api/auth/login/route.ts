import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/db";
import { createAdminSession, createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { email, password } = body ?? {};

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
  }

  // Check admin credentials from env (no DB involved)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (
    adminEmail && adminPassword &&
    email.trim().toLowerCase() === adminEmail.toLowerCase() &&
    password === adminPassword
  ) {
    await createAdminSession();
    return NextResponse.json({ isAdmin: true });
  }

  // Regular user login
  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, company: user.company },
  });
}
