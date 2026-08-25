import { NextRequest, NextResponse } from "next/server";
import {
  assignImportedLead,
  bulkAssignImportedLeads,
  distributeImportedLeads,
  getAllUsers,
  getUserById,
} from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });

  const allUsers = await getAllUsers();
  const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

  // Mode 1: Round-Robin Distribution
  if (body.mode === "round_robin") {
    const leadIds: string[] = Array.isArray(body.leadIds) ? body.leadIds : [];
    if (leadIds.length === 0) {
      return NextResponse.json({ error: "No lead IDs provided for distribution." }, { status: 400 });
    }

    let targetUsers = allUsers;
    if (Array.isArray(body.userIds) && body.userIds.length > 0) {
      targetUsers = allUsers.filter((u) => body.userIds.includes(u.id));
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: "No target users available for distribution." }, { status: 400 });
    }

    const result = await distributeImportedLeads(
      leadIds,
      targetUsers.map((u) => ({ id: u.id, name: u.name }))
    );

    return NextResponse.json({
      success: true,
      message: `Successfully distributed ${result.assignedCount} leads across ${targetUsers.length} users.`,
      assignedCount: result.assignedCount,
      leads: result.leads,
    });
  }

  // Mode 2: Bulk assignment to a single user
  if (Array.isArray(body.leadIds) && body.leadIds.length > 0 && body.userId) {
    const userName = body.userName || userMap.get(body.userId) || "Assigned User";
    const result = await bulkAssignImportedLeads(body.leadIds, body.userId, userName);

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${result.assignedCount} leads to ${userName}.`,
      assignedCount: result.assignedCount,
      leads: result.leads,
    });
  }

  // Mode 3: Single assignment
  if (body.leadId && body.userId) {
    const userName = body.userName || userMap.get(body.userId) || "Assigned User";
    const result = await assignImportedLead(body.leadId, body.userId, userName);

    if (!result) {
      return NextResponse.json({ error: "Imported lead not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned lead to ${userName}.`,
      importedLead: result.importedLead,
      lead: result.lead,
    });
  }

  return NextResponse.json(
    { error: "Missing required fields. Provide either (leadId, userId) or (leadIds, userId) or (leadIds, mode: 'round_robin')." },
    { status: 400 }
  );
}
