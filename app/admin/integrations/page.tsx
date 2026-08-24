import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import IntegrationsClient from "./IntegrationsClient";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const googleSheetsToken = process.env.GOOGLE_SHEETS_SYNC_TOKEN || "fx_sheets_sync_2026";

  return <IntegrationsClient googleSheetsToken={googleSheetsToken} />;
}
