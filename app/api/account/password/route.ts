import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserById, updateUserPassword } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { currentPassword, newPassword } = body ?? {};

  if (typeof currentPassword !== "string" || !currentPassword) {
    return NextResponse.json({ error: "Please enter your current password." }, { status: 400 });
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(session.userId, passwordHash);

  return NextResponse.json({ success: true });
}
