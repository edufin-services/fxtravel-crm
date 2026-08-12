import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { deleteResetToken, getResetToken, updateUserPassword } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { token, password } = body ?? {};

  if (typeof token !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Invalid request. Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const resetToken = await getResetToken(token);
  if (!resetToken) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await updateUserPassword(resetToken.userId, passwordHash);
  await deleteResetToken(token);

  return NextResponse.json({ success: true });
}
