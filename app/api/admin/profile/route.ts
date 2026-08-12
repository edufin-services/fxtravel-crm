import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminSettings, updateAdminSettings } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminSettings();
  const emailFromName = process.env.EMAIL_FROM_NAME || "Fxpertise Admin";

  return NextResponse.json({
    profile: {
      name: settings.name || "Administrator",
      email: settings.email || process.env.ADMIN_EMAIL || "admin@fxpertise.com",
      role: settings.role || "Super Admin",
      phone: settings.phone || "+91 98765 43210",
    },
    company: {
      company: settings.company || "Fxpertise Solution Pvt. Ltd.",
      companyWebsite: settings.companyWebsite || "https://fxpertise.com",
      companyIndustry: settings.companyIndustry || "Travel & Forex CRM",
      companyTimezone: settings.companyTimezone || "Asia/Kolkata (IST)",
    },
    system: {
      environment: process.env.NODE_ENV || "development",
      emailFromName,
      smtpHost: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
      smtpPort: process.env.EMAIL_SERVER_PORT || "587",
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const { action, currentPassword, newPassword } = body;

  // Handle password update action
  if (action === "password" || newPassword) {
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters long." }, { status: 400 });
    }

    const currentSettings = await getAdminSettings();
    if (currentSettings.passwordHash && currentPassword) {
      const valid = await bcrypt.compare(currentPassword, currentSettings.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await updateAdminSettings({ passwordHash });
    return NextResponse.json({
      message: "Admin security password updated successfully.",
      profile: {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        phone: updated.phone,
      },
    });
  }

  // Handle standard profile/company details update
  const updates: Record<string, any> = {};
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.email === "string" && body.email.trim()) updates.email = body.email.trim();
  if (typeof body.phone === "string") updates.phone = body.phone.trim();
  if (typeof body.company === "string") updates.company = body.company.trim();
  if (typeof body.companyWebsite === "string") updates.companyWebsite = body.companyWebsite.trim();
  if (typeof body.companyIndustry === "string") updates.companyIndustry = body.companyIndustry.trim();
  if (typeof body.companyTimezone === "string") updates.companyTimezone = body.companyTimezone.trim();

  const updated = await updateAdminSettings(updates);

  return NextResponse.json({
    message: "Admin details updated successfully.",
    profile: {
      name: updated.name,
      email: updated.email,
      role: updated.role,
      phone: updated.phone,
    },
    company: {
      company: updated.company,
      companyWebsite: updated.companyWebsite,
      companyIndustry: updated.companyIndustry,
      companyTimezone: updated.companyTimezone,
    },
  });
}
