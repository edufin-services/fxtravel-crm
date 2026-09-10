import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { dbConnect } from "@/lib/mongoose";
import { LeadModel } from "@/lib/models";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const query = {
    $or: [
      { services: "Tours & Packages" },
      { serviceType: "Tours & Packages" },
    ],
  };

  const leads = await LeadModel.find(query);
  let updatedCount = 0;

  for (const lead of leads) {
    const rawServices: string[] = Array.isArray(lead.services) ? lead.services : [];
    let updatedServices = [...rawServices];
    let updatedServiceType = lead.serviceType;

    const notesText = `${lead.notes || ""} ${lead.formNotes || ""}`.toLowerCase();
    const fallbackTour = notesText.includes("international") ? "International Tours" : "Domestic Tours";

    if (updatedServices.includes("Tours & Packages")) {
      const hasTour = updatedServices.some((s) => s === "Domestic Tours" || s === "International Tours");
      if (hasTour) {
        updatedServices = updatedServices.filter((s) => s !== "Tours & Packages");
      } else {
        updatedServices = updatedServices.map((s) => (s === "Tours & Packages" ? fallbackTour : s));
      }
    }

    if (updatedServiceType === "Tours & Packages") {
      updatedServiceType = fallbackTour;
    }

    await LeadModel.updateOne(
      { _id: lead._id },
      {
        $set: {
          services: updatedServices,
          serviceType: updatedServiceType,
        },
      }
    );
    updatedCount++;
  }

  return NextResponse.json({
    success: true,
    matchedCount: leads.length,
    updatedCount,
    message: `Successfully migrated ${updatedCount} leads from 'Tours & Packages' to Domestic / International Tours`,
  });
}
