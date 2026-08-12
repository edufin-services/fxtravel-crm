import { NextRequest, NextResponse } from "next/server";
import { createResetToken, getUserByEmail } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { email } = body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
  }

  try {
    const user = await getUserByEmail(email);

    if (user) {
      const { token } = await createResetToken(user.id);
      const resetUrl = `${request.nextUrl.origin}/reset-password?token=${token}`;
      console.log(`[forgot-password] Reset link for ${user.email}: ${resetUrl}`);
      await sendPasswordResetEmail(user.email, resetUrl);
    }
  } catch (err) {
    console.error("[forgot-password] Error processing reset request:", err);
  }

  return NextResponse.json({ success: true });
}
