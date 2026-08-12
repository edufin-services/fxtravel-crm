import { NextRequest, NextResponse } from "next/server";
import { getContactsByOwner, getConversationsByOwner, getLeadsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

export type SearchResult = {
  id: string;
  type: "lead" | "contact" | "conversation";
  title: string;
  subtitle: string;
  href: string;
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const results: SearchResult[] = [];

  const [leads, contacts, conversations] = await Promise.all([
    getLeadsByOwner(session.userId),
    getContactsByOwner(session.userId),
    getConversationsByOwner(session.userId),
  ]);

  for (const lead of leads) {
    if (lead.name.toLowerCase().includes(query)) {
      results.push({
        id: lead.id,
        type: "lead",
        title: lead.name,
        subtitle: `${lead.channel} · ${lead.stage}`,
        href: `/dashboard/leads?leadId=${lead.id}`,
      });
    }
  }

  for (const contact of contacts) {
    if (
      contact.name.toLowerCase().includes(query) ||
      contact.company.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query)
    ) {
      results.push({
        id: contact.id,
        type: "contact",
        title: contact.name,
        subtitle: `${contact.company} · ${contact.email}`,
        href: "/dashboard/lists",
      });
    }
  }

  for (const conversation of conversations) {
    if (
      conversation.name.toLowerCase().includes(query) ||
      conversation.company.toLowerCase().includes(query) ||
      conversation.preview.toLowerCase().includes(query)
    ) {
      results.push({
        id: conversation.id,
        type: "conversation",
        title: conversation.name,
        subtitle: conversation.preview,
        href: "/dashboard/chats",
      });
    }
  }

  return NextResponse.json({ results: results.slice(0, 8) });
}
