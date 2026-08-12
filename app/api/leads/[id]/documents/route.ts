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

  const docs: { name: string; url: string; uploadedAt: string }[] = lead.documents ?? [];
  if (docs.length >= 10) {
    return NextResponse.json({ error: "Maximum 10 documents allowed per lead." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dir = path.join(process.cwd(), "public", "uploads", "leads", id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), buffer);

  const doc = { name: file.name, url: `/uploads/leads/${id}/${safeName}`, uploadedAt: new Date().toISOString() };
  lead.documents = [...docs, doc];
  await lead.save();

  return NextResponse.json({ document: doc });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { url } = await request.json().catch(() => ({ url: null }));
  if (!url) return NextResponse.json({ error: "Missing url." }, { status: 400 });

  await dbConnect();
  const lead = await LeadModel.findOne({ id, ownerId: session.userId });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  lead.documents = (lead.documents ?? []).filter((d: { url: string }) => d.url !== url);
  await lead.save();

  // Best-effort delete file from disk
  try {
    const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    await unlink(filePath);
  } catch { /* ignore */ }

  return NextResponse.json({ success: true });
}
