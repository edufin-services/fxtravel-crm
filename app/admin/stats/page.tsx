import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  getAllBranches,
  getAllContacts,
  getAllLeads,
  getAllTasks,
  getAllUsers,
} from "@/lib/db";
import AdminStatsClient from "./AdminStatsClient";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [leads, users, branches, tasks, contacts] = await Promise.all([
    getAllLeads(),
    getAllUsers(),
    getAllBranches(),
    getAllTasks(),
    getAllContacts(),
  ]);

  return (
    <AdminStatsClient
      leads={leads}
      users={users}
      branches={branches}
      tasks={tasks}
      contacts={contacts}
    />
  );
}
