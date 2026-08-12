import { NextRequest, NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/db";
import { getSession } from "@/lib/session";

const TASK_TYPES = ["call", "email", "meeting", "message"] as const;

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const { title, contact, type, dueDate, done, leadId, leadName } = body ?? {};
  const updates: Partial<{
    title: string; contact: string; type: typeof TASK_TYPES[number];
    dueDate: string; done: boolean; leadId: string; leadName: string;
  }> = {};

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) return NextResponse.json({ error: "Invalid title." }, { status: 400 });
    updates.title = title.trim();
  }
  if (contact !== undefined) {
    if (typeof contact !== "string" || !contact.trim()) return NextResponse.json({ error: "Invalid contact." }, { status: 400 });
    updates.contact = contact.trim();
  }
  if (type !== undefined) {
    if (!TASK_TYPES.includes(type)) return NextResponse.json({ error: "Invalid type." }, { status: 400 });
    updates.type = type;
  }
  if (dueDate !== undefined) {
    if (typeof dueDate !== "string" || isNaN(new Date(dueDate).getTime())) return NextResponse.json({ error: "Invalid due date." }, { status: 400 });
    updates.dueDate = new Date(dueDate).toISOString();
  }
  if (done !== undefined) {
    if (typeof done !== "boolean") return NextResponse.json({ error: "Invalid done flag." }, { status: 400 });
    updates.done = done;
  }
  if (leadId !== undefined) updates.leadId = leadId ? String(leadId) : undefined;
  if (leadName !== undefined) updates.leadName = leadName ? String(leadName) : undefined;

  const task = await updateTask(id, session.userId, updates);
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  return NextResponse.json({ task });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await deleteTask(id, session.userId);
  return NextResponse.json({ success: true });
}
