import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  getAllContacts,
  getAllLeads,
  getAllTasks,
  getContactsByOwner,
  getLeadsByOwner,
  getTasksByOwner,
  getUserById,
} from "@/lib/db";
import StatsClientView, { StatsDataset } from "./StatsClientView";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const user = await getUserById(session.userId);
  const userName = user?.name || "Agent";
  const isAdmin = Boolean(session.isAdmin);

  // Fetch personal data and (if admin) complete org data in parallel
  const [personalLeads, personalContacts, personalTasks] = await Promise.all([
    getLeadsByOwner(session.userId),
    getContactsByOwner(session.userId),
    getTasksByOwner(session.userId),
  ]);

  const personalData: StatsDataset = {
    label: "My Portfolio",
    leads: personalLeads,
    contacts: personalContacts,
    tasks: personalTasks,
  };

  let orgData: StatsDataset | undefined;
  if (isAdmin) {
    const [allLeads, allContacts, allTasks] = await Promise.all([
      getAllLeads(),
      getAllContacts(),
      getAllTasks(),
    ]);
    orgData = {
      label: "Organization Overview",
      leads: allLeads,
      contacts: allContacts,
      tasks: allTasks,
    };
  }

  return (
    <StatsClientView
      isAdmin={isAdmin}
      userName={userName}
      personalData={personalData}
      orgData={orgData}
    />
  );
}
