import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";

async function run() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("No .env.local found");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/MONGODB_URI=(.+)/);
  if (!match) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  const uri = match[1].trim();
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);

  const collection = mongoose.connection.collection("leads");

  const query = {
    $or: [
      { services: "Tours & Packages" },
      { serviceType: "Tours & Packages" },
    ],
  };

  const cursor = collection.find(query);
  const leads = await cursor.toArray();
  console.log(`Found ${leads.length} leads with "Tours & Packages"`);

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

    await collection.updateOne(
      { _id: lead._id },
      {
        $set: {
          services: updatedServices,
          serviceType: updatedServiceType,
        },
      }
    );
    updatedCount++;
    console.log(`Updated lead ${lead.id || lead._id} (${lead.name}): services=[${updatedServices.join(", ")}], serviceType=${updatedServiceType}`);
  }

  console.log(`Successfully migrated ${updatedCount} leads.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
