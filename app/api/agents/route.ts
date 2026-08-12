import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/db";
import { getSession } from "@/lib/session";

// Returns all registered user accounts as a list of { id, name }
// Used to populate the Assign Agent dropdown in the lead drawer.
export async function GET() {
  const session = await getSession();
  if (!session?.userId && !session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getAllUsers();
  const agents = users.map((u) => ({ id: u.id, name: u.name }));
  return NextResponse.json({ agents });
}
