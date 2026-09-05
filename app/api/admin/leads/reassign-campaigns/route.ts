import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { dbConnect } from "@/lib/mongoose";
import { LeadModel } from "@/lib/models";
import { getAllUsers, logLeadActivity } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    await dbConnect();
    const users = await getAllUsers();

    const mouparna = users.find(
      (u) =>
        u.email?.toLowerCase().includes("mouparna") ||
        u.name?.toLowerCase().includes("mouparna")
    );
    const sheeba = users.find(
      (u) =>
        u.email?.toLowerCase().includes("sheeba") ||
        u.name?.toLowerCase().includes("sheeba")
    );

    if (!mouparna && !sheeba) {
      return NextResponse.json(
        { error: "Neither Mouparna nor Sheeba found in registered CRM users" },
        { status: 400 }
      );
    }

    const leads = await LeadModel.find({ deletedAt: null });
    let kolkataCount = 0;
    let delhiCount = 0;

    for (const lead of leads) {
      const text = [
        lead.city || "",
        lead.state || "",
        lead.notes || "",
        lead.name || "",
      ].join(" ").toLowerCase();

      const isKolkata =
        text.includes("kolkata") ||
        text.includes("calcutta") ||
        text.includes("west bengal") ||
        text.includes(" wb ");

      const isDelhi =
        text.includes("delhi") ||
        text.includes("ncr") ||
        text.includes("gurgaon") ||
        text.includes("gurugram") ||
        text.includes("noida") ||
        text.includes("faridabad") ||
        text.includes("ghaziabad");

      if (isKolkata && mouparna && lead.ownerId !== mouparna.id) {
        await LeadModel.updateOne(
          { id: lead.id },
          {
            $set: {
              ownerId: mouparna.id,
              city: "Kolkata",
            },
          }
        );
        logLeadActivity({
          type: "lead_updated",
          leadId: lead.id,
          leadName: lead.name,
          ownerId: mouparna.id,
          channel: lead.channel,
          details: `Lead transferred to Mouparna Banerjee (Kolkata Campaign Rule)`,
        }).catch(() => null);
        kolkataCount++;
      } else if (isDelhi && sheeba && lead.ownerId !== sheeba.id) {
        await LeadModel.updateOne(
          { id: lead.id },
          {
            $set: {
              ownerId: sheeba.id,
              city: "Delhi NCR",
            },
          }
        );
        logLeadActivity({
          type: "lead_updated",
          leadId: lead.id,
          leadName: lead.name,
          ownerId: sheeba.id,
          channel: lead.channel,
          details: `Lead transferred to Sheeba Birla (Delhi NCR Campaign Rule)`,
        }).catch(() => null);
        delhiCount++;
      }
    }

    return NextResponse.json({
      success: true,
      kolkataTransferred: kolkataCount,
      delhiTransferred: delhiCount,
      totalTransferred: kolkataCount + delhiCount,
      executives: {
        kolkata: mouparna ? { id: mouparna.id, name: mouparna.name } : null,
        delhi: sheeba ? { id: sheeba.id, name: sheeba.name } : null,
      },
    });
  } catch (error: any) {
    console.error("Failed to reassign campaign leads:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
