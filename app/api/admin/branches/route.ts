import { NextRequest, NextResponse } from "next/server";
import { createOrUpdateBranch, getAllBranches, getAllLeads, updateLeadAdmin } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [branches, leads] = await Promise.all([
      getAllBranches(),
      getAllLeads(),
    ]);

    // Compute aggregated counts and pipeline volumes
    const delhiLeads = leads.filter(
      (l) =>
        l.city?.toLowerCase().includes("delhi") ||
        l.assignedBranchName?.toLowerCase().includes("delhi") ||
        l.assignedBranchId === "br-delhi-01"
    );

    const kolkataLeads = leads.filter(
      (l) =>
        l.city?.toLowerCase().includes("kolkata") ||
        l.assignedBranchName?.toLowerCase().includes("kolkata") ||
        l.assignedBranchId === "br-kolkata-01"
    );

    const unassignedLeads = leads.filter(
      (l) =>
        !l.city?.toLowerCase().includes("delhi") &&
        !l.city?.toLowerCase().includes("kolkata") &&
        !l.assignedBranchName?.toLowerCase().includes("delhi") &&
        !l.assignedBranchName?.toLowerCase().includes("kolkata") &&
        l.assignedBranchId !== "br-delhi-01" &&
        l.assignedBranchId !== "br-kolkata-01"
    );

    return NextResponse.json({
      success: true,
      branches,
      stats: {
        totalLeads: leads.length,
        delhi: {
          count: delhiLeads.length,
          value: delhiLeads.reduce((acc, l) => acc + (l.value || 0), 0),
          confirmed: delhiLeads.filter((l) => l.stage === "Confirmed").length,
        },
        kolkata: {
          count: kolkataLeads.length,
          value: kolkataLeads.reduce((acc, l) => acc + (l.value || 0), 0),
          confirmed: kolkataLeads.filter((l) => l.stage === "Confirmed").length,
        },
        unassigned: {
          count: unassignedLeads.length,
          value: unassignedLeads.reduce((acc, l) => acc + (l.value || 0), 0),
        },
      },
    });
  } catch (err: any) {
    console.error("[api/admin/branches] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch branches data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { name, city, address, phone, email, status } = body;

    if (!name || !city) {
      return NextResponse.json({ error: "Name and city are required." }, { status: 400 });
    }

    const branch = await createOrUpdateBranch({
      id: body.id,
      name: name.trim(),
      city: city.trim(),
      address: address?.trim() || "",
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      status: status === "suspended" ? "suspended" : "active",
    });

    return NextResponse.json({ success: true, branch });
  } catch (err: any) {
    console.error("[api/admin/branches] POST error:", err);
    return NextResponse.json({ error: "Failed to create/update branch" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { leadId, branchId, branchName, city } = body;

    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required." }, { status: 400 });
    }

    const updated = await updateLeadAdmin(leadId, {
      assignedBranchId: branchId || undefined,
      assignedBranchName: branchName || undefined,
      city: city || undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead: updated });
  } catch (err: any) {
    console.error("[api/admin/branches] PATCH error:", err);
    return NextResponse.json({ error: "Failed to assign branch" }, { status: 500 });
  }
}
