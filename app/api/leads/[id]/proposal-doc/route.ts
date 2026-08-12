import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { LeadModel } from "@/lib/models";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await dbConnect();

  const lead = await LeadModel.findOne({ id, ownerId: session.userId });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  if (lead.proposalDoc?.url) {
    try {
      await unlink(path.join(process.cwd(), "public", lead.proposalDoc.url.replace(/^\//, "")));
    } catch { /* ignore */ }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = `proposal-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dir = path.join(process.cwd(), "public", "uploads", "leads", id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), buffer);

  const proposalDoc = { name: file.name, url: `/uploads/leads/${id}/${safeName}`, uploadedAt: new Date().toISOString() };
  lead.proposalDoc = proposalDoc;
  await lead.save();

  return NextResponse.json({ proposalDoc });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await dbConnect();

  const lead = await LeadModel.findOne({ id, ownerId: session.userId });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  if (lead.proposalDoc?.url) {
    try {
      await unlink(path.join(process.cwd(), "public", lead.proposalDoc.url.replace(/^\//, "")));
    } catch { /* ignore */ }
  }

  lead.proposalDoc = null;
  await lead.save();

  return NextResponse.json({ success: true });
}
