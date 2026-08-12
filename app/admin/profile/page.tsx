"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AdminProfile = {
  name: string;
  email: string;
  role: string;
  phone: string;
};

type CompanyInfo = {
  company: string;
  companyWebsite: string;
  companyIndustry: string;
  companyTimezone: string;
};

type SystemInfo = {
  environment: string;
  emailFromName: string;
  smtpHost: string;
  smtpPort: string;
};

const inputCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-2.5 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors";
const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500 uppercase tracking-wide";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "company" | "security">("personal");

  const [profile, setProfile] = useState<AdminProfile>({
    name: "Administrator",
    email: "admin@fxpertise.com",
    role: "Super Admin",
    phone: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [company, setCompany] = useState<CompanyInfo>({
    company: "Fxpertise Solution Pvt. Ltd.",
    companyWebsite: "https://fxpertise.com",
    companyIndustry: "Travel & Forex CRM",
    companyTimezone: "Asia/Kolkata (IST)",
  });
  const [companySaving, setCompanySaving] = useState(false);
  const [companyMessage, setCompanyMessage] = useState("");
  const [companyError, setCompanyError] = useState("");

  const [system, setSystem] = useState<SystemInfo>({
    environment: "production",
    emailFromName: "Fxpertise Admin",
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
        if (data.company) setCompany(data.company);
        if (data.system) setSystem(data.system);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setProfileSaving(true);

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error ?? "Failed to update profile.");
        return;
      }
      if (data.profile) setProfile(data.profile);
      setProfileMessage("Admin profile updated successfully!");
      router.refresh();
      setTimeout(() => setProfileMessage(""), 3500);
    } catch {
      setProfileError("An unexpected error occurred.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    setCompanyError("");
    setCompanyMessage("");
    setCompanySaving(true);

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      const data = await res.json();
      if (!res.ok) {
        setCompanyError(data.error ?? "Failed to update organization details.");
        return;
      }
      if (data.company) setCompany(data.company);
      setCompanyMessage("Organization details updated successfully!");
      router.refresh();
      setTimeout(() => setCompanyMessage(""), 3500);
    } catch {
      setCompanyError("An unexpected error occurred.");
    } finally {
      setCompanySaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? "Failed to update password.");
        return;
      }
      setPasswordMessage("Admin security password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage(""), 3500);
    } catch {
      setPasswordError("An unexpected error occurred.");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-500 font-semibold">
          <div className="h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          Loading Admin Profile...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Top Banner & Header Card */}
      <div className="relative rounded-3xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 relative">
          <div className="absolute right-6 top-6 flex items-center gap-2">
            <span className="rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black px-3 py-1 border border-white/30">
              SUPER ADMIN
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative flex flex-wrap items-end justify-between gap-4 -mt-10">
          <div className="flex items-end gap-4">
            <div className="flex h-20 w-20 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-2xl font-black text-white shadow-md ring-4 ring-white">
              {initials(profile.name || "A")}
            </div>
            <div className="mb-1">
              <h1 className="text-xl font-black text-zinc-900">{profile.name}</h1>
              <p className="text-xs font-semibold text-zinc-500">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3 py-1.5 text-xs font-bold shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Administrator Session
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-200 gap-6 text-xs font-bold">
        {[
          { id: "personal", label: "Admin Profile", icon: "👤" },
          { id: "company", label: "Organization Info", icon: "🏢" },
          { id: "security", label: "Security & Passwords", icon: "🔒" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700 font-black"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Personal Admin Profile */}
      {activeTab === "personal" && (
        <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Admin Account Information</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Manage system administrator identity and contact details</p>
          </div>

          {profileError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 font-medium">
              {profileError}
            </div>
          )}
          {profileMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 font-bold">
              {profileMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Administrator Name *</label>
              <input
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={inputCls}
                placeholder="Administrator"
              />
            </div>
            <div>
              <label className={labelCls}>System Email Address *</label>
              <input
                required
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Phone Number</label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className={inputCls}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className={labelCls}>Account Role</label>
              <input
                disabled
                value={profile.role}
                className={`${inputCls} bg-zinc-100/80 cursor-not-allowed opacity-80`}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 transition-all cursor-pointer"
            >
              {profileSaving ? "Saving..." : "Save Admin Profile"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Organization Info */}
      {activeTab === "company" && (
        <form onSubmit={handleCompanySubmit} className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Organization & Platform Settings</h2>
            <p className="text-xs text-zinc-400 mt-0.5">System organization details and default platform timezone</p>
          </div>

          {companyError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 font-medium">
              {companyError}
            </div>
          )}
          {companyMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 font-bold">
              {companyMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Company / Entity Name</label>
              <input
                value={company.company}
                onChange={(e) => setCompany({ ...company, company: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Official Website</label>
              <input
                value={company.companyWebsite}
                onChange={(e) => setCompany({ ...company, companyWebsite: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Industry Sector</label>
              <input
                value={company.companyIndustry}
                onChange={(e) => setCompany({ ...company, companyIndustry: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Primary System Timezone</label>
              <input
                value={company.companyTimezone}
                onChange={(e) => setCompany({ ...company, companyTimezone: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100">
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wide mb-3">System Gateway Status</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Environment</p>
                <p className="text-xs font-bold text-zinc-800 mt-0.5 capitalize">{system.environment}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">SMTP Host</p>
                <p className="text-xs font-bold text-zinc-800 mt-0.5">{system.smtpHost}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Sender Identity</p>
                <p className="text-xs font-bold text-zinc-800 mt-0.5">{system.emailFromName}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={companySaving}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 transition-all cursor-pointer"
            >
              {companySaving ? "Saving..." : "Save Organization Settings"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Security & Passwords */}
      {activeTab === "security" && (
        <form onSubmit={handlePasswordSubmit} className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Change Admin Password</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Ensure strong password standards to protect master administrative access</p>
          </div>

          {passwordError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 font-medium">
              {passwordError}
            </div>
          )}
          {passwordMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 font-bold">
              {passwordMessage}
            </div>
          )}

          <div>
            <label className={labelCls}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
              placeholder="Enter current password (optional if setting first custom password)"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>New Password *</label>
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputCls}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password *</label>
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputCls}
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 transition-all cursor-pointer"
            >
              {passwordSaving ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
