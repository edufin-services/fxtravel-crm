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

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = `otc-invoice-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dir = path.join(process.cwd(), "public", "uploads", "leads", id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), buffer);

  const invoice = { name: file.name, url: `/uploads/leads/${id}/${safeName}`, uploadedAt: new Date().toISOString() };
  lead.otcInvoices = [...(lead.otcInvoices ?? []), invoice];
  await lead.save();

  return NextResponse.json({ invoice });
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

  lead.otcInvoices = (lead.otcInvoices ?? []).filter((d: { url: string }) => d.url !== url);
  await lead.save();

  try {
    await unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")));
  } catch { /* ignore */ }

  return NextResponse.json({ success: true });
}
