import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createConversation,
  createLead,
  createMessage,
  getAllUsers,
  getConversationByWhatsappId,
  getLeadByWhatsappId,
  getUserById,
} from "@/lib/db";

// ── helpers ────────────────────────────────────────────────────────────────

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Meta webhook verification (GET) ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── Incoming messages (POST) ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? "";
  let ownerId = process.env.WHATSAPP_OWNER_ID ?? "";
  const signature = request.headers.get("x-hub-signature-256");

  // Verify signature when secret is configured
  if (appSecret && !verifySignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Resolve ownerId gracefully
  if (ownerId && !(await getUserById(ownerId))) {
    console.warn(`WhatsApp webhook: WHATSAPP_OWNER_ID (${ownerId}) not found in DB. Falling back to first user.`);
    const users = await getAllUsers();
    if (users.length > 0) ownerId = users[0].id;
  } else if (!ownerId) {
    const users = await getAllUsers();
    if (users.length > 0) ownerId = users[0].id;
  }

  if (!ownerId) {
    console.error("WhatsApp webhook: WHATSAPP_OWNER_ID is missing or invalid");
    return NextResponse.json({ error: "Owner not configured" }, { status: 500 });
  }

  let body: WhatsAppPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ignored" });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const messages = value.messages ?? [];
      if (messages.length === 0) continue;

      const contactsMap: Record<string, string> = {};
      for (const c of value.contacts ?? []) {
        contactsMap[c.wa_id] = c.profile?.name ?? c.wa_id;
      }

      for (const msg of messages) {
        const waId = msg.from;
        if (!waId) continue;

        const senderName = contactsMap[waId] ?? `+${waId}`;
        const text = msg.text?.body ?? msg.caption ?? (msg.type ? `[${msg.type} message]` : "New WhatsApp message");
        const now = new Date().toISOString();

        // Create lead if this is the first message from this number
        if (!(await getLeadByWhatsappId(ownerId, waId))) {
          await createLead({
            ownerId,
            name: senderName,
            channel: "WhatsApp",
            value: 0,
            stage: "Initial",
            whatsappId: waId,
            phone: `+${waId}`,
          });
        }

        // Create or reuse conversation thread
        let conversation = await getConversationByWhatsappId(ownerId, waId);
        if (!conversation) {
          conversation = await createConversation({
            ownerId,
            name: senderName,
            company: `WhatsApp +${waId}`,
            channel: "WhatsApp",
            preview: text,
            unread: 0,
            updatedAt: now,
            whatsappId: waId,
          });
        }

        // Append the message to the conversation
        await createMessage(conversation.id, ownerId, "them", text);
      }
    }
  }

  // Meta expects a 200 OK quickly
  return NextResponse.json({ status: "ok" });
}

// ── Types ──────────────────────────────────────────────────────────────────

type WhatsAppPayload = {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id: string }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          caption?: string;
        }>;
      };
    }>;
  }>;
};
