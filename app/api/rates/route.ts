import { NextRequest, NextResponse } from "next/server";
import { getLowestRates } from "@/lib/lowest-price-service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "Mumbai";

  try {
    const rates = await getLowestRates(city);
    return NextResponse.json({ city, rates });
  } catch (err) {
    console.error("[api/rates] Error fetching rates:", err);
    return NextResponse.json({ error: "Failed to fetch live rates" }, { status: 500 });
  }
}
