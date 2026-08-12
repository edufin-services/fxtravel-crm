import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getLeadsByOwner, getUserById } from "@/lib/db";
import { getSession } from "@/lib/session";
import AgentKanbanClient from "./AgentKanbanClient";

export default async function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const { id } = await params;
  const [agent, leads] = await Promise.all([getUserById(id), getLeadsByOwner(id)]);
  if (!agent) notFound();

  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading branch pipeline...</div>}>
      <AgentKanbanClient
        agent={{
          id: agent.id,
          name: agent.name,
          email: agent.email,
          company: agent.company,
          createdAt: agent.createdAt,
        }}
        initialLeads={leads as any}
      />
    </Suspense>
  );
}
