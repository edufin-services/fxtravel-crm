import { NextRequest, NextResponse } from "next/server";
import { getAllBranches, getBranchById, updateBranchMargins } from "@/lib/db";
import { recalculateLowestPricesForCity } from "@/lib/lowest-price-service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId") || "br-mumbai-01";

  try {
    const branch = await getBranchById(branchId);
    const allBranches = await getAllBranches();
    return NextResponse.json({ branch, allBranches });
  } catch (err) {
    console.error("[api/branch] Failed to fetch branch data:", err);
    return NextResponse.json({ error: "Failed to fetch branch details" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { branchId = "br-mumbai-01", margins, city = "Mumbai" } = body ?? {};

  if (!margins) {
    return NextResponse.json({ error: "Margins object is required." }, { status: 400 });
  }

  try {
    await updateBranchMargins(branchId, margins);
    // Recalculate lowest price engine for the city immediately
    const updatedLowest = await recalculateLowestPricesForCity(city);
    return NextResponse.json({ success: true, updatedLowest });
  } catch (err) {
    console.error("[api/branch] Failed to update margins:", err);
    return NextResponse.json({ error: "Failed to update branch margins." }, { status: 500 });
  }
}
