import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAllLeads, getLeadsByOwner } from "@/lib/db";
import { createLeadsWorkbook } from "@/lib/exportLeads";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId && !session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const stage = searchParams.get("stage")?.trim();
  const channel = searchParams.get("channel")?.trim();
  const query = searchParams.get("q")?.trim().toLowerCase();

  // 1. Fetch leads based on role
  let leads = session.isAdmin ? await getAllLeads() : await getLeadsByOwner(session.userId!);

  // 2. Apply query filters if present
  if (stage && stage !== "All Stages" && stage !== "All") {
    leads = leads.filter((l) => l.stage.toLowerCase() === stage.toLowerCase());
  }

  if (channel && channel !== "All") {
    leads = leads.filter((l) => l.channel.toLowerCase() === channel.toLowerCase());
  }

  if (query) {
    leads = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        (l.phone && l.phone.includes(query)) ||
        (l.email && l.email.toLowerCase().includes(query)) ||
        (l.city && l.city.toLowerCase().includes(query))
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `CRM_Leads_${dateStr}.${format}`;

  // 3. Generate workbook
  const wb = createLeadsWorkbook(leads as any, {
    format,
    includeSummarySheet: format === "xlsx",
  });

  const buffer = XLSX.write(wb, {
    type: "buffer",
    bookType: format === "csv" ? "csv" : "xlsx",
  });

  const contentType =
    format === "csv"
      ? "text/csv; charset=utf-8"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
