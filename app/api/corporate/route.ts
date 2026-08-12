import { NextRequest, NextResponse } from "next/server";
import { createCorporateRequest, getAllCorporates } from "@/lib/db";

export async function GET() {
  try {
    const corporates = await getAllCorporates();
    return NextResponse.json({ corporates });
  } catch (err) {
    console.error("[api/corporate] Failed to fetch corporates:", err);
    return NextResponse.json({ error: "Failed to fetch corporate accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { companyName, hodEmail, city = "Mumbai", monthlyLimitINR = 1000000 } = body ?? {};

  if (!companyName || !hodEmail) {
    return NextResponse.json({ error: "Company name and HOD email are required." }, { status: 400 });
  }

  try {
    const corp = await createCorporateRequest({ companyName, hodEmail, city, monthlyLimitINR: Number(monthlyLimitINR) });
    return NextResponse.json({ success: true, corporate: corp });
  } catch (err) {
    console.error("[api/corporate] Failed to create corporate account:", err);
    return NextResponse.json({ error: "Failed to register corporate account." }, { status: 500 });
  }
}
