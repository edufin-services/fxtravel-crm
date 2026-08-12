import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ clientVisits: [] });
}

export async function POST() {
  return NextResponse.json({ error: "Client visits feature is disabled." }, { status: 400 });
}
