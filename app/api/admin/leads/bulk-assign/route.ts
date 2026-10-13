import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserById, updateLeadAdmin } from "@/lib/db";
import { STAGES, type Stage } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { leadIds, targetUserId, stage } = body ?? {};

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: "Please select at least one lead" }, { status: 400 });
  }

  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ error: "Please select a target user" }, { status: 400 });
  }

  const targetUser = await getUserById(targetUserId);
  if (!targetUser) {
    return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  }

  const validStage: Stage | undefined = stage && STAGES.includes(stage) ? (stage as Stage) : undefined;

  const updatedLeads = [];
  for (const id of leadIds) {
    if (typeof id !== "string") continue;
    const updated = await updateLeadAdmin(id, {
      ownerId: targetUserId,
      assignAgent: targetUser.name,
      ...(validStage ? { stage: validStage } : {}),
    });
    if (updated) {
      updatedLeads.push(updated);
    }
  }

  return NextResponse.json({
    success: true,
    count: updatedLeads.length,
    targetUserName: targetUser.name,
    leads: updatedLeads,
  });
}
