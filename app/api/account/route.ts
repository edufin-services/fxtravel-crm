import { NextRequest, NextResponse } from "next/server";
import { getNotificationPrefs, getTeamMembers, getUserById, getUserChannels, updateUserProfile } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, channels, notificationPrefs, teamMembers] = await Promise.all([
    getUserById(session.userId),
    getUserChannels(session.userId),
    getNotificationPrefs(session.userId),
    getTeamMembers(session.userId),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    profile: { name: user.name, email: user.email, phone: user.phone ?? "" },
    company: {
      company: user.company,
      companyWebsite: user.companyWebsite ?? "",
      companyIndustry: user.companyIndustry ?? "",
      companyTimezone: user.companyTimezone ?? "",
    },
    channels,
    notificationPrefs,
    teamMembers,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name, email, phone } = body ?? {};
  const updates: Partial<{ name: string; email: string; phone: string }> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    updates.name = name.trim();
  }
  if (email !== undefined) {
    if (typeof email !== "string" || !email.trim()) return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    updates.email = email.trim();
  }
  if (phone !== undefined) {
    if (typeof phone !== "string") return NextResponse.json({ error: "Invalid phone." }, { status: 400 });
    updates.phone = phone.trim();
  }

  const user = await updateUserProfile(session.userId, updates);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({ profile: { name: user.name, email: user.email, phone: user.phone ?? "" } });
}
