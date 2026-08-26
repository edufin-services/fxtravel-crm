import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { type Channel } from "@/lib/constants";
import {
  createImportedLeads,
  deleteImportedLead,
  deleteImportedLeads,
  getAllUsers,
  getImportedLeads,
} from "@/lib/db";
import { getSession } from "@/lib/session";

function normalizePlatform(val: unknown): { platform: string; channel: Channel } {
  const str = String(val ?? "").trim().toLowerCase();
  if (str === "fb" || str.includes("facebook") || str.includes("meta ads") || str === "meta") {
    return { platform: "fb", channel: "Facebook" };
  }
  if (str === "ig" || str.includes("instagram") || str.includes("insta")) {
    return { platform: "ig", channel: "Instagram" };
  }
  if (str === "wa" || str.includes("whatsapp")) {
    return { platform: "whatsapp", channel: "WhatsApp" };
  }
  if (str.includes("ad") || str.includes("google")) {
    return { platform: "ads", channel: "Ads" };
  }
  if (str.includes("email") || str.includes("mail")) {
    return { platform: "email", channel: "Email" };
  }
  return { platform: str || "fb", channel: "Facebook" };
}

function cleanPhoneNumber(val: unknown): { clean: string; raw: string } {
  const raw = String(val ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  let clean = digits;
  if (digits.length === 12 && digits.startsWith("91")) {
    clean = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    clean = digits.slice(1);
  } else if (digits.length > 10) {
    clean = digits.slice(-10);
  }
  return { clean, raw };
}

function extractRowsFromWorkbook(buffer: ArrayBuffer | Buffer, fileName: string = "") {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const parsedLeads: Array<{
    name: string;
    phone: string;
    rawPhone: string;
    platform: string;
    channel: Channel;
    fileName: string;
  }> = [];

  for (const row of rawRows) {
    // Find matching keys regardless of case or spaces
    let nameVal = "";
    let phoneVal = "";
    let platformVal = "";

    for (const [key, val] of Object.entries(row)) {
      const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, "");
      if (
        normalizedKey === "fullname" ||
        normalizedKey === "name" ||
        normalizedKey === "clientname" ||
        normalizedKey === "customername" ||
        normalizedKey === "leadname" ||
        normalizedKey === "contactname"
      ) {
        nameVal = String(val).trim();
      } else if (
        normalizedKey === "whatsappnumber" ||
        normalizedKey === "whatsapp" ||
        normalizedKey === "phone" ||
        normalizedKey === "phonenumber" ||
        normalizedKey === "mobile" ||
        normalizedKey === "mobilenumber" ||
        normalizedKey === "number" ||
        normalizedKey === "contact" ||
        normalizedKey === "contactno"
      ) {
        phoneVal = String(val).trim();
      } else if (
        normalizedKey === "platform" ||
        normalizedKey === "source" ||
        normalizedKey === "channel" ||
        normalizedKey === "sourceplatform" ||
        normalizedKey === "adplatform" ||
        normalizedKey === "social"
      ) {
        platformVal = String(val).trim();
      }
    }

    // Fallback: If column names were not matched, check 3-column rows by position
    if (!nameVal && !phoneVal && Object.keys(row).length > 0) {
      const values = Object.values(row).map((v) => String(v).trim());
      if (values.length >= 3) {
        // e.g. [platform, full_name, whatsapp_number] as shown in user screenshot
        platformVal = values[0];
        nameVal = values[1];
        phoneVal = values[2];
      }
    }

    if (!nameVal && !phoneVal) continue;

    const { clean, raw } = cleanPhoneNumber(phoneVal);
    const { platform, channel } = normalizePlatform(platformVal);

    parsedLeads.push({
      name: nameVal || "Unnamed Lead",
      phone: clean || raw || "—",
      rawPhone: raw,
      platform,
      channel,
      fileName,
    });
  }

  return parsedLeads;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = request.nextUrl.searchParams.get("status") || undefined;
  const [leads, users] = await Promise.all([
    getImportedLeads(status ? { status } : undefined),
    getAllUsers(),
  ]);

  return NextResponse.json({
    leads,
    users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, company: u.company })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") || "";

  let leadsToInsert: Array<{
    name: string;
    phone: string;
    rawPhone?: string;
    platform?: string;
    channel?: Channel;
    fileName?: string;
  }> = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided in form-data." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    leadsToInsert = extractRowsFromWorkbook(buffer, file.name);
  } else {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    }

    if (Array.isArray(body.leads)) {
      leadsToInsert = body.leads.map((l: any) => {
        const { clean, raw } = cleanPhoneNumber(l.phone || l.whatsapp_number || l.number || l.mobile);
        const { platform, channel } = normalizePlatform(l.platform || l.channel || l.source);
        return {
          name: String(l.name || l.full_name || "Unnamed Lead").trim(),
          phone: clean || raw || "—",
          rawPhone: raw,
          platform,
          channel,
          fileName: String(l.fileName || body.fileName || "manual_upload.xls"),
        };
      });
    }
  }

  if (leadsToInsert.length === 0) {
    return NextResponse.json(
      { error: "No valid lead rows found in the uploaded file. Please ensure columns include name, phone/whatsapp, and platform." },
      { status: 400 }
    );
  }

  const result = await createImportedLeads(leadsToInsert);
  return NextResponse.json({
    success: true,
    count: result.created.length,
    skippedCount: result.skippedCount,
    duplicates: result.duplicates,
    leads: result.created,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    await deleteImportedLead(id);
    return NextResponse.json({ success: true });
  }

  const body = await request.json().catch(() => null);
  if (Array.isArray(body?.ids) && body.ids.length > 0) {
    const count = await deleteImportedLeads(body.ids);
    return NextResponse.json({ success: true, deletedCount: count });
  }

  return NextResponse.json({ error: "Invalid delete parameters." }, { status: 400 });
}
