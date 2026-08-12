import { NextRequest, NextResponse } from "next/server";
import { createMessage, getConversationById, getMessagesByConversation } from "@/lib/db";
import { getSession } from "@/lib/session";

async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn("WhatsApp credentials (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID) missing.");
    return;
  }

  const cleanedPhone = to.replace(/\D/g, "");
  if (!cleanedPhone) return;

  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanedPhone,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Meta WhatsApp API send error:", data);
    } else {
      console.log("WhatsApp message sent successfully to:", cleanedPhone);
    }
  } catch (err) {
    console.error("Failed to send WhatsApp message via Meta API:", err);
  }
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/conversations/[id]/messages">) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const conversation = await getConversationById(id, session.userId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const messages = await getMessagesByConversation(id, session.userId);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/conversations/[id]/messages">) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const { text } = body ?? {};

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }

  const conversation = await getConversationById(id, session.userId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const message = await createMessage(id, session.userId, "me", text.trim());
  if (!message) {
    return NextResponse.json({ error: "Failed to create message." }, { status: 500 });
  }

  // If conversation is a WhatsApp channel, attempt to send via Meta Cloud API
  const recipient = conversation.whatsappId || conversation.company || conversation.name;
  if (conversation.channel === "WhatsApp" && recipient) {
    await sendWhatsAppMessage(recipient, text.trim());
  }

  return NextResponse.json({ message });
}
