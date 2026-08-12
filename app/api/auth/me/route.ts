import { NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  if (session.isAdmin) {
    return NextResponse.json({
      user: { id: "__admin__", name: "Admin", email: process.env.ADMIN_EMAIL ?? "admin", isAdmin: true },
    });
  }

  if (!session.userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, company: user.company },
  });
}
