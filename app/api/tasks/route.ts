import { NextRequest, NextResponse } from "next/server";
import { createTask, getTasksByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

const TASK_TYPES = ["call", "email", "meeting", "message"] as const;

export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tasks = await getTasksByOwner(session.userId);
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { title, contact, type, dueDate, leadId, leadName } = body ?? {};

  if (
    typeof title !== "string" || typeof contact !== "string" ||
    !title.trim() || !contact.trim() ||
    !TASK_TYPES.includes(type) ||
    typeof dueDate !== "string" || isNaN(new Date(dueDate).getTime())
  ) {
    return NextResponse.json({ error: "Please fill in all fields with valid values." }, { status: 400 });
  }

  const task = await createTask({
    ownerId: session.userId, title: title.trim(), contact: contact.trim(),
    type, dueDate: new Date(dueDate).toISOString(), done: false,
    ...(leadId ? { leadId: String(leadId) } : {}),
    ...(leadName ? { leadName: String(leadName) } : {}),
  });
  return NextResponse.json({ task });
}
