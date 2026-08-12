import { NextRequest, NextResponse } from "next/server";
import { getAllLeads, getAllUsers, getDeletedLeads } from "@/lib/db";
import { getSession } from "@/lib/session";

export type AdminSearchResult = {
  id: string;
  type: "agent" | "lead" | "trash";
  title: string;
  subtitle: string;
  href: string;
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const [agents, leads, deletedLeads] = await Promise.all([
    getAllUsers(),
    getAllLeads(),
    getDeletedLeads(),
  ]);

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));
  const results: AdminSearchResult[] = [];

  // 1. Search Agents
  for (const agent of agents) {
    if (
      agent.name.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query) ||
      (agent.company && agent.company.toLowerCase().includes(query))
    ) {
      results.push({
        id: agent.id,
        type: "agent",
        title: agent.name,
        subtitle: `${agent.email} · ${agent.company || "Agent"}`,
        href: `/admin/agents/${agent.id}`,
      });
    }
  }

  // 2. Search Active Leads
  for (const lead of leads) {
    if (
      lead.name.toLowerCase().includes(query) ||
      (lead.phone && lead.phone.includes(query)) ||
      (lead.email && lead.email.toLowerCase().includes(query)) ||
      (lead.assignAgent && lead.assignAgent.toLowerCase().includes(query)) ||
      lead.stage.toLowerCase().includes(query)
    ) {
      const assigned = agentMap[lead.ownerId] || lead.assignAgent || "Unassigned";
      results.push({
        id: lead.id,
        type: "lead",
        title: lead.name,
        subtitle: `${lead.channel} · ${lead.stage} · ${assigned}`,
        href: lead.ownerId ? `/admin/agents/${lead.ownerId}?leadId=${lead.id}` : `/admin/leads?leadId=${lead.id}`,
      });
    }
  }

  // 3. Search Trash Leads
  for (const lead of deletedLeads) {
    if (
      lead.name.toLowerCase().includes(query) ||
      (lead.phone && lead.phone.includes(query)) ||
      (lead.email && lead.email.toLowerCase().includes(query)) ||
      lead.stage.toLowerCase().includes(query)
    ) {
      const assigned = agentMap[lead.ownerId] || lead.assignAgent || "Unassigned";
      results.push({
        id: lead.id,
        type: "trash",
        title: lead.name,
        subtitle: `Deleted Lead · ${lead.channel} · ${lead.stage} · ${assigned}`,
        href: `/admin/trash?q=${encodeURIComponent(lead.name)}`,
      });
    }
  }

  return NextResponse.json({ results: results.slice(0, 12) });
}
