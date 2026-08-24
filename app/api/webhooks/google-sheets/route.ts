import { NextRequest, NextResponse } from "next/server";
import { createLead, getAllUsers, getUserById } from "@/lib/db";
import { dbConnect } from "@/lib/mongoose";
import { LeadModel, UserModel } from "@/lib/models";

// ── GET: Health Check & Token Verification ─────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token") || searchParams.get("auth_token");
  const expectedToken = process.env.GOOGLE_SHEETS_SYNC_TOKEN || "fx_sheets_sync_2026";

  if (token && token !== expectedToken) {
    return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
  }

  return NextResponse.json({
    status: "active",
    message: "Google Sheets Lead Webhook Endpoint is active and listening",
    endpoint: "/api/webhooks/google-sheets",
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}

// ── Helper to find first matching key in object ─────────────────────────────
function extractField(data: Record<string, any>, candidateKeys: string[]): string {
  // 1. Exact match
  for (const key of candidateKeys) {
    if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== "") {
      return String(data[key]).trim();
    }
  }

  // 2. Case-insensitive & normalized match
  const dataKeys = Object.keys(data);
  for (const candidate of candidateKeys) {
    const candNorm = candidate.toLowerCase().replace(/[\s_-]+/g, "");
    for (const dk of dataKeys) {
      const dkNorm = dk.toLowerCase().replace(/[\s_-]+/g, "");
      if (dkNorm === candNorm && data[dk] !== undefined && data[dk] !== null && String(data[dk]).trim() !== "") {
        return String(data[dk]).trim();
      }
    }
  }

  return "";
}

// ── POST: Ingest Lead from Google Sheet ────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let data: Record<string, any> = {};

    // 1. Parse incoming payload
    if (contentType.includes("application/json")) {
      try {
        data = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
      }
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      formData.forEach((val, key) => {
        data[key] = val.toString();
      });
    } else {
      const rawText = await request.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        const params = new URLSearchParams(rawText);
        params.forEach((val, key) => {
          data[key] = val;
        });
      }
    }

    // 2. Security Check (Token authentication)
    const reqToken =
      request.headers.get("x-crm-token") ||
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      request.nextUrl.searchParams.get("token") ||
      data.token ||
      data.auth_token;

    const expectedToken = process.env.GOOGLE_SHEETS_SYNC_TOKEN || "fx_sheets_sync_2026";
    if (expectedToken && reqToken !== expectedToken) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401 }
      );
    }

    // 3. Extract & Normalize Field Values from Sheet Columns
    const name =
      extractField(data, [
        "name",
        "Name",
        "Full Name",
        "FullName",
        "full_name",
        "Customer Name",
        "Client Name",
        "Student Name",
        "Lead Name",
        "Contact Person",
      ]) || "Google Sheets Lead";

    const phone = extractField(data, [
      "phone",
      "Phone",
      "Mobile",
      "mobile",
      "Mobile Number",
      "Phone Number",
      "Contact",
      "contact",
      "Contact Number",
      "WhatsApp",
      "whatsapp",
      "phone_number",
      "mobile_no",
    ]);

    const email = extractField(data, [
      "email",
      "Email",
      "Email Address",
      "Email ID",
      "email_address",
      "emailid",
      "mail",
    ]);

    const city =
      extractField(data, [
        "city",
        "City",
        "Location",
        "location",
        "Town",
        "Address",
        "Area",
        "branch",
      ]) || "Mumbai";

    const state = extractField(data, ["state", "State", "Region", "Province"]);

    const rawService = extractField(data, [
      "service",
      "Service",
      "Service Type",
      "service_type",
      "Requirements",
      "requirements",
      "Course",
      "Course/Country",
      "Category",
      "Package",
      "Inquiry For",
      "Purpose",
    ]);

    const rawValue = extractField(data, [
      "value",
      "Value",
      "amount",
      "Amount",
      "Budget",
      "budget",
      "Price",
      "price",
      "Deal Value",
      "Fee",
    ]);
    const parsedValue = Number(rawValue.replace(/[^0-9.]/g, ""));
    const value = !isNaN(parsedValue) && parsedValue > 0 ? parsedValue : 25000;

    const notes = extractField(data, [
      "notes",
      "Notes",
      "Remarks",
      "remarks",
      "Comments",
      "Message",
      "message",
      "Description",
      "Query",
      "Feedback",
    ]);

    const sheetRowId =
      data._rowNumber ||
      data.rowId ||
      data.row ||
      data.Row ||
      data.id ||
      data.ID ||
      "";

    // 4. Resolve Target CRM Owner / Agent
    let ownerId =
      data.ownerId ||
      data.assignedTo ||
      process.env.GOOGLE_SHEETS_OWNER_ID ||
      process.env.WHATSAPP_OWNER_ID ||
      "";

    // If agent email was passed, look up owner by email
    const agentEmail = extractField(data, ["agentEmail", "assignedAgentEmail", "Owner Email", "Agent Email"]);
    if (agentEmail) {
      await dbConnect();
      const userByEmail = await UserModel.findOne({ email: agentEmail.toLowerCase() });
      if (userByEmail) {
        ownerId = userByEmail.id;
      }
    }

    if (ownerId && !(await getUserById(ownerId))) {
      ownerId = "";
    }

    if (!ownerId) {
      const users = await getAllUsers();
      if (users.length > 0) {
        ownerId = users[0].id;
      }
    }

    if (!ownerId) {
      return NextResponse.json(
        { error: "No active CRM user found to assign lead" },
        { status: 500 }
      );
    }

    // 5. Categorize Service Type
    let serviceType = "Tours & Packages";
    if (rawService) {
      const catLower = rawService.toLowerCase();
      if (
        catLower.includes("money transfer") ||
        catLower.includes("forex") ||
        catLower.includes("remittance") ||
        catLower.includes("currency") ||
        catLower.includes("exchange")
      ) {
        serviceType = "Outward Remittance";
      } else if (
        catLower.includes("card") ||
        catLower.includes("reload")
      ) {
        serviceType = "Forex Card Reload";
      } else if (
        catLower.includes("sim") ||
        catLower.includes("esim")
      ) {
        serviceType = "International SIM";
      } else if (
        catLower.includes("tour") ||
        catLower.includes("travel") ||
        catLower.includes("package") ||
        catLower.includes("flight") ||
        catLower.includes("hotel")
      ) {
        serviceType = "Tours & Packages";
      } else {
        serviceType = rawService;
      }
    }

    // 6. Deduplication Check (Avoid duplicate leads within 12 hours for same phone)
    await dbConnect();
    if (phone) {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const existing = await LeadModel.findOne({
        phone,
        channel: "Google Sheets",
        createdAt: { $gte: twelveHoursAgo },
        deletedAt: null,
      });

      if (existing) {
        return NextResponse.json(
          {
            status: "ignored",
            message: "Duplicate lead within 12 hours ignored",
            leadId: existing.id,
            leadName: existing.name,
          },
          { status: 200 }
        );
      }
    }

    // 7. Format Ingestion Notes
    let compiledNotes = `[Google Sheets Ingestion]`;
    if (sheetRowId) compiledNotes += `\nSheet Row: #${sheetRowId}`;
    if (rawService) compiledNotes += `\nRequested Service: ${rawService}`;
    if (state) compiledNotes += `\nState: ${state}`;
    if (notes) compiledNotes += `\nRemarks: ${notes}`;

    // 8. Create New Lead in Database
    const newLead = await createLead({
      ownerId,
      name,
      phone: phone || undefined,
      email: email || undefined,
      channel: "Referral/Others",
      stage: "Initial",
      value,
      serviceType,
      city,
      state: state || undefined,
      notes: compiledNotes,
      services: [serviceType],
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Lead successfully ingested into CRM from Google Sheets",
        leadId: newLead.id,
        leadName: newLead.name,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Google Sheets Webhook Error:", error);
    return NextResponse.json(
      { error: "Failed to ingest Google Sheets lead", details: error.message },
      { status: 500 }
    );
  }
}
