import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");
  redirect("/admin/dashboard");
}
