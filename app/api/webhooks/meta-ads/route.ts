import { NextRequest, NextResponse } from "next/server";
import { createLead, getAllUsers } from "@/lib/db";
import { AdminSettingsModel, LeadModel } from "@/lib/models";
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

    await dbConnect();
    const adminSettings = await AdminSettingsModel.findOne({ id: "admin_settings" }).lean();

    const pageAccessToken =
      process.env.META_PAGE_ACCESS_TOKEN ||
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
      (adminSettings as any)?.metaPageAccessToken ||
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
        let leadCity = "";
        let leadPlatform = "Facebook";
        let apiError = "";
        const extraFormFields: string[] = [];

        // 1. If we have a Page Access Token, fetch lead details from Meta Graph API
        if (pageAccessToken) {
          try {
            const graphRes = await fetch(
              `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${pageAccessToken}`
            );
            const leadData = await graphRes.json().catch(() => null);

            if (graphRes.ok && leadData) {
              const fieldData: Array<{ name: string; values: string[] }> = Array.isArray(leadData.field_data)
                ? leadData.field_data
                : [];

              const extractedName = extractMetaField(fieldData, [
                "full_name",
                "name",
                "first_name",
                "customer_name",
                "your_name",
              ]);
              const extractedPhone = extractMetaField(fieldData, [
                "phone_number",
                "whatsapp_number",
                "phone",
                "mobile_number",
                "contact_number",
                "mobile",
              ]);
              const extractedEmail = extractMetaField(fieldData, [
                "email",
                "email_address",
              ]);
              const extractedCity = extractMetaField(fieldData, [
                "city",
                "location",
                "current_city",
              ]);
              const extractedPlatform = extractMetaField(fieldData, [
                "platform",
                "source",
              ]);

              if (extractedName) leadName = extractedName;
              if (extractedPhone) leadPhone = extractedPhone;
              if (extractedEmail) leadEmail = extractedEmail;
              if (extractedCity) leadCity = extractedCity;
              if (extractedPlatform) {
                leadPlatform =
                  extractedPlatform.toLowerCase().includes("ig") ||
                  extractedPlatform.toLowerCase().includes("instagram")
                    ? "Instagram"
                    : "Facebook";
              }

              // Collect any custom questions from the lead form (destinations, travel dates, budget, etc.)
              for (const field of fieldData) {
                const normName = field.name?.toLowerCase().replace(/[\s_-]+/g, "");
                const isStandardField = [
                  "fullname",
                  "name",
                  "firstname",
                  "customername",
                  "yourname",
                  "phonenumber",
                  "whatsappnumber",
                  "phone",
                  "mobilenumber",
                  "contactnumber",
                  "mobile",
                  "email",
                  "emailaddress",
                  "platform",
                  "source",
                  "city",
                  "location",
                  "currentcity",
                ].includes(normName);

                if (!isStandardField && Array.isArray(field.values) && field.values.length > 0) {
                  extraFormFields.push(`${field.name}: ${field.values.join(", ")}`);
                }
              }
            } else {
              apiError = leadData?.error?.message || `HTTP ${graphRes.status}`;
              console.error(`[Meta Webhook] Meta Graph API returned error for leadgen ${leadgenId}:`, apiError);
            }
          } catch (err: any) {
            apiError = err?.message || "Failed to query Meta Graph API";
            console.error("[Meta Webhook] Network exception querying Meta Graph API:", err);
          }
        } else {
          apiError = "META_PAGE_ACCESS_TOKEN is missing on server";
          console.warn("[Meta Webhook] No page access token available to query lead details.");
        }

        // Clean phone number
        const rawPhone = leadPhone;
        const digits = rawPhone.replace(/\D/g, "");
        let cleanPhone = digits;
        if (digits.length === 12 && digits.startsWith("91")) cleanPhone = digits.slice(2);
        else if (digits.length === 11 && digits.startsWith("0")) cleanPhone = digits.slice(1);
        else if (digits.length > 10) cleanPhone = digits.slice(-10);

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

        // Determine lead owner using Round-Robin across active CRM users
        const users = await getAllUsers();
        let assignedOwnerId = "admin";
        let assignedOwnerName = "Admin";

        if (users.length > 0) {
          // Atomically increment round-robin counter
          const settings = await AdminSettingsModel.findOneAndUpdate(
            { id: "admin_settings" },
            { $inc: { metaRoundRobinIndex: 1 } },
            { upsert: true, new: true }
          );

          const index = (settings.metaRoundRobinIndex || 0) % users.length;
          const assignedUser = users[index];
          if (assignedUser) {
            assignedOwnerId = assignedUser.id;
            assignedOwnerName = assignedUser.name;
          }
        }

        // Build informative notes
        const noteLines: string[] = [
          `Meta Lead Ads (Round-Robin to ${assignedOwnerName}) · Form ID: ${formId || "N/A"} · Leadgen ID: ${leadgenId}`,
        ];
        if (apiError) {
          noteLines.push(`⚠️ Meta Lead Info Notice: ${apiError}`);
          noteLines.push(`👉 Fix: Ensure a non-expired Page Access Token is configured in META_PAGE_ACCESS_TOKEN on Vercel.`);
        }
        if (extraFormFields.length > 0) {
          noteLines.push(`📋 Form Answers:\n` + extraFormFields.map((f) => `• ${f}`).join("\n"));
        }

        // Create lead in CRM Initial Stage for the assigned user
        const created = await createLead({
          ownerId: assignedOwnerId,
          name: leadName,
          phone: cleanPhone || rawPhone || "—",
          email: leadEmail,
          city: leadCity || undefined,
          channel: leadPlatform === "Instagram" ? "Instagram" : "Facebook",
          stage: "Initial",
          value: 0,
          notes: noteLines.join("\n\n"),
          services: [],
        });

        results.push({
          status: "created",
          leadId: created.id,
          leadgenId,
          assignedTo: { id: assignedOwnerId, name: assignedOwnerName },
        });
      }
    }

    return NextResponse.json({ success: true, processed: results }, { status: 200 });
  } catch (error: any) {
    console.error("Meta Webhook Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
