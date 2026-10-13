import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getAllUsers, getLeadsByOwner, getUserById, type User } from "@/lib/db";
import { getSession } from "@/lib/session";
import AgentKanbanClient from "./AgentKanbanClient";

export default async function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const { id } = await params;
  const [agent, leads, allUsers] = await Promise.all([
    getUserById(id),
    getLeadsByOwner(id),
    getAllUsers(),
  ]);
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
          isLeadPaused: !!agent.isLeadPaused,
          leadPauseReason: agent.leadPauseReason || "",
          leadPausedAt: agent.leadPausedAt || "",
        }}
        initialLeads={leads as any}
        allAgents={allUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          company: u.company,
          isLeadPaused: !!u.isLeadPaused,
          leadPauseReason: u.leadPauseReason || "",
        }))}
      />
    </Suspense>
  );
}
