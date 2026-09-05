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

        let campaignName = "";
        let adsetName = "";
        let adName = "";

        // 1. If we have a Page Access Token, fetch lead details from Meta Graph API
        if (pageAccessToken) {
          try {
            const graphRes = await fetch(
              `https://graph.facebook.com/v21.0/${leadgenId}?fields=id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data&access_token=${pageAccessToken}`
            );
            const leadData = await graphRes.json().catch(() => null);

            if (graphRes.ok && leadData) {
              campaignName = leadData.campaign_name || "";
              adsetName = leadData.adset_name || "";
              adName = leadData.ad_name || "";

              // If campaign name is not populated directly on leadgen, fetch via campaign_id
              if (!campaignName && leadData.campaign_id) {
                try {
                  const campRes = await fetch(
                    `https://graph.facebook.com/v21.0/${leadData.campaign_id}?fields=name&access_token=${pageAccessToken}`
                  );
                  const campData = await campRes.json().catch(() => null);
                  if (campData?.name) campaignName = campData.name;
                } catch {}
              }

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

        // ── Executive Campaign Assignment ────────────────────────────────────
        // Rule: Kolkata Campaign / City / Form -> Mouparna Banerjee
        // Rule: Delhi NCR Campaign / City / Form -> Sheeba Birla
        // Fallback: Round-Robin across registered active executives
        const routingHaystack = [
          campaignName,
          adsetName,
          adName,
          leadCity,
          formId,
          ...extraFormFields,
        ].join(" ").toLowerCase();

        const isKolkata =
          routingHaystack.includes("kolkata") ||
          routingHaystack.includes("calcutta") ||
          routingHaystack.includes("west bengal") ||
          routingHaystack.includes(" wb ") ||
          String(formId).includes("9031550");

        const isDelhi =
          routingHaystack.includes("delhi") ||
          routingHaystack.includes("ncr") ||
          routingHaystack.includes("gurgaon") ||
          routingHaystack.includes("gurugram") ||
          routingHaystack.includes("noida") ||
          routingHaystack.includes("faridabad") ||
          routingHaystack.includes("ghaziabad") ||
          String(formId).includes("1058624");

        const users = await getAllUsers();
        const mouparna = users.find(
          (u) =>
            u.email?.toLowerCase().includes("mouparna") ||
            u.name?.toLowerCase().includes("mouparna")
        );
        const sheeba = users.find(
          (u) =>
            u.email?.toLowerCase().includes("sheeba") ||
            u.name?.toLowerCase().includes("sheeba")
        );

        let assignedOwnerId = "admin";
        let assignedOwnerName = "Admin";
        let routingReason = "Default Admin";

        if (isKolkata && mouparna) {
          assignedOwnerId = mouparna.id;
          assignedOwnerName = mouparna.name;
          routingReason = "Kolkata Campaign → Mouparna Banerjee";
          if (!leadCity) leadCity = "Kolkata";
        } else if (isDelhi && sheeba) {
          assignedOwnerId = sheeba.id;
          assignedOwnerName = sheeba.name;
          routingReason = "Delhi NCR Campaign → Sheeba Birla";
          if (!leadCity) leadCity = "Delhi NCR";
        } else if (users.length > 0) {
          // Atomically increment round-robin counter for non-campaign leads
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
            routingReason = `Round-Robin (${assignedOwnerName})`;
          }
        }

        // Determine service category from adset
        const leadServices: string[] = ["Tours & Packages"];
        const lowerAdset = adsetName.toLowerCase();
        if (lowerAdset.includes("international")) {
          leadServices.unshift("International Tours");
        } else if (lowerAdset.includes("domestic")) {
          leadServices.unshift("Domestic Tours");
        }

        // Build informative notes
        const noteLines: string[] = [
          `🎯 Campaign: ${campaignName || (isKolkata ? "Kolkata" : isDelhi ? "Delhi NCR leads" : "Meta Lead Ads")}`,
          adsetName ? `📌 Adset: ${adsetName}` : "",
          adName ? `📢 Ad: ${adName}` : "",
          `👤 Assigned: ${assignedOwnerName} (${routingReason})`,
          `Form ID: ${formId || "N/A"} · Leadgen ID: ${leadgenId}`,
        ].filter(Boolean);

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
          services: leadServices,
          serviceType: leadServices[0],
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
