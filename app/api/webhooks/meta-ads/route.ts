import { NextRequest, NextResponse } from "next/server";
import { createLead, getAllUsers } from "@/lib/db";
import { LeadModel } from "@/lib/models";
import { dbConnect } from "@/lib/mongoose";

// ── GET: Webhook Verification Endpoint for Meta ──────────────────────────────
// When you click "Verify and save" in Meta for Developers, Meta sends a GET request
// with hub.mode, hub.verify_token, and hub.challenge.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_VERIFY_TOKEN || "fx_meta_leads_token_2026";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("✅ Meta Webhook verified successfully!");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
}

// ── Helper to extract values from Meta field_data ────────────────────────────
function extractMetaField(fieldData: Array<{ name: string; values: string[] }>, keys: string[]): string {
  if (!Array.isArray(fieldData)) return "";
  for (const field of fieldData) {
    const normName = field.name.toLowerCase().replace(/[\s_-]+/g, "");
    for (const key of keys) {
      if (normName === key.toLowerCase().replace(/[\s_-]+/g, "") && field.values?.[0]) {
        return String(field.values[0]).trim();
      }
    }
  }
  return "";
}

// ── POST: Receive Real-Time Lead from Meta Lead Ads ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || body.object !== "page") {
      return NextResponse.json({ error: "Invalid event object" }, { status: 400 });
    }

    const pageAccessToken =
      process.env.META_PAGE_ACCESS_TOKEN ||
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
      "";

    const entries = Array.isArray(body.entry) ? body.entry : [];
    const results = [];

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      for (const change of changes) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        const formId = change.value?.form_id;
        const pageId = change.value?.page_id || entry.id;

        if (!leadgenId) continue;

        let leadName = "Meta Lead";
        let leadPhone = "";
        let leadEmail = "";
        let leadPlatform = "Facebook";

        // 1. If we have a Page Access Token, fetch lead details from Meta Graph API
        if (pageAccessToken) {
          try {
            const graphRes = await fetch(
              `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${pageAccessToken}`
            );
            if (graphRes.ok) {
              const leadData = await graphRes.json();
              const fieldData = leadData.field_data || [];

              const extractedName = extractMetaField(fieldData, [
                "full_name",
                "name",
                "first_name",
                "customer_name",
              ]);
              const extractedPhone = extractMetaField(fieldData, [
                "phone_number",
                "whatsapp_number",
                "phone",
                "mobile_number",
                "contact_number",
              ]);
              const extractedEmail = extractMetaField(fieldData, [
                "email",
                "email_address",
              ]);
              const extractedPlatform = extractMetaField(fieldData, [
                "platform",
                "source",
              ]);

              if (extractedName) leadName = extractedName;
              if (extractedPhone) leadPhone = extractedPhone;
              if (extractedEmail) leadEmail = extractedEmail;
              if (extractedPlatform) {
                leadPlatform = extractedPlatform.toLowerCase().includes("ig") || extractedPlatform.toLowerCase().includes("instagram")
                  ? "Instagram"
                  : "Facebook";
              }
            }
          } catch (err) {
            console.error("Failed to query Meta Graph API for lead details:", err);
          }
        }

        // Clean phone number
        const rawPhone = leadPhone;
        const digits = rawPhone.replace(/\D/g, "");
        let cleanPhone = digits;
        if (digits.length === 12 && digits.startsWith("91")) cleanPhone = digits.slice(2);
        else if (digits.length === 11 && digits.startsWith("0")) cleanPhone = digits.slice(1);
        else if (digits.length > 10) cleanPhone = digits.slice(-10);

        await dbConnect();

        // Check for duplicate lead in active CRM
        if (cleanPhone && cleanPhone.length >= 7) {
          const existing = await LeadModel.findOne({
            deletedAt: null,
            phone: { $regex: cleanPhone },
          });
          if (existing) {
            console.log(`Duplicate lead skipped: ${leadName} (${cleanPhone})`);
            results.push({ status: "skipped_duplicate", leadgenId });
            continue;
          }
        }

        // Determine lead owner (default to first active admin or round-robin user)
        const users = await getAllUsers();
        const defaultOwnerId = users[0]?.id || "admin";

        // Create lead in CRM Initial Stage
        const created = await createLead({
          ownerId: defaultOwnerId,
          name: leadName,
          phone: cleanPhone || rawPhone || "—",
          email: leadEmail,
          channel: leadPlatform === "Instagram" ? "Instagram" : "Facebook",
          stage: "Initial",
          value: 0,
          notes: `Lead from Meta Lead Ads · Form ID: ${formId || "N/A"} · Leadgen ID: ${leadgenId}`,
          services: [],
        });

        results.push({ status: "created", leadId: created.id, leadgenId });
      }
    }

    return NextResponse.json({ success: true, processed: results }, { status: 200 });
  } catch (error: any) {
    console.error("Meta Webhook Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
