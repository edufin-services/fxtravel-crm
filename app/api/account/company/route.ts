import { NextRequest, NextResponse } from "next/server";
import { updateCompanyInfo } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { company, companyWebsite, companyIndustry, companyTimezone } = body ?? {};
  const updates: Partial<{ company: string; companyWebsite: string; companyIndustry: string; companyTimezone: string }> = {};

  if (company !== undefined) {
    if (typeof company !== "string" || !company.trim()) return NextResponse.json({ error: "Invalid company name." }, { status: 400 });
    updates.company = company.trim();
  }
  if (companyWebsite !== undefined) {
    if (typeof companyWebsite !== "string") return NextResponse.json({ error: "Invalid website." }, { status: 400 });
    updates.companyWebsite = companyWebsite.trim();
  }
  if (companyIndustry !== undefined) {
    if (typeof companyIndustry !== "string") return NextResponse.json({ error: "Invalid industry." }, { status: 400 });
    updates.companyIndustry = companyIndustry.trim();
  }
  if (companyTimezone !== undefined) {
    if (typeof companyTimezone !== "string") return NextResponse.json({ error: "Invalid time zone." }, { status: 400 });
    updates.companyTimezone = companyTimezone.trim();
  }

  const user = await updateCompanyInfo(session.userId, updates);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({
    company: {
      company: user.company,
      companyWebsite: user.companyWebsite ?? "",
      companyIndustry: user.companyIndustry ?? "",
      companyTimezone: user.companyTimezone ?? "",
    },
  });
}
