"use client";

import { useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon } from "../icons";

type Profile = {
  name: string;
  email: string;
  phone: string;
};

type Company = {
  company: string;
  companyWebsite: string;
  companyIndustry: string;
  companyTimezone: string;
};

const GRADIENTS: Record<string, string> = {
  A:"from-rose-400 to-rose-600",B:"from-pink-400 to-pink-600",C:"from-fuchsia-400 to-fuchsia-600",
  D:"from-violet-400 to-violet-600",E:"from-indigo-400 to-indigo-600",F:"from-blue-400 to-blue-600",
  G:"from-sky-400 to-sky-600",H:"from-cyan-400 to-cyan-600",I:"from-teal-400 to-teal-600",
  J:"from-emerald-400 to-emerald-600",K:"from-green-400 to-green-600",L:"from-lime-400 to-lime-600",
  M:"from-amber-400 to-amber-600",N:"from-orange-400 to-orange-600",O:"from-red-400 to-red-600",
  P:"from-rose-400 to-rose-600",Q:"from-purple-400 to-purple-600",R:"from-blue-400 to-blue-600",
  S:"from-sky-400 to-sky-600",T:"from-teal-400 to-teal-600",U:"from-cyan-400 to-cyan-600",
  V:"from-violet-400 to-violet-600",W:"from-fuchsia-400 to-fuchsia-600",X:"from-indigo-400 to-indigo-600",
  Y:"from-amber-400 to-amber-600",Z:"from-orange-400 to-orange-600",
};
const grad = (name: string) => GRADIENTS[name[0]?.toUpperCase() ?? "A"] ?? "from-emerald-500 to-teal-600";
const initials = (name: string) => name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const inputCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-2.5 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition-colors";
const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500 uppercase tracking-wide";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "company" | "security">("personal");

  const [profile, setProfile] = useState<Profile>({ name: "", email: "", phone: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [company, setCompany] = useState<Company>({ company: "", companyWebsite: "", companyIndustry: "", companyTimezone: "" });
  const [companySaving, setCompanySaving] = useState(false);
  const [companyMessage, setCompanyMessage] = useState("");
  const [companyError, setCompanyError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
        if (data.company) setCompany(data.company);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setProfileSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    setProfileSaving(false);
    if (!res.ok) { setProfileError(data.error ?? "Something went wrong."); return; }
    setProfile(data.profile);
    setProfileMessage("Profile info updated successfully!");
    setTimeout(() => setProfileMessage(""), 3500);
  }

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    setCompanyError("");
    setCompanyMessage("");
    setCompanySaving(true);
    const res = await fetch("/api/account/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });
    const data = await res.json();
    setCompanySaving(false);
    if (!res.ok) { setCompanyError(data.error ?? "Something went wrong."); return; }
    setCompany(data.company);
    setCompanyMessage("Company info updated successfully!");
    setTimeout(() => setCompanyMessage(""), 3500);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setPasswordSaving(true);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setPasswordSaving(false);
    if (!res.ok) { setPasswordError(data.error ?? "Something went wrong."); return; }
    setPasswordMessage("Password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordMessage(""), 3500);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-3xl bg-zinc-200 animate-pulse" />
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 animate-pulse space-y-4">
          <div className="h-5 w-40 rounded bg-zinc-200" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-zinc-200" />
              <div className="h-10 rounded-xl bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      {/* ── Profile Cover Banner & Header ───────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-xs">
        {/* Cover Graphic Header */}
        <div className="h-32 w-full bg-gradient-to-r from-zinc-900 via-teal-900 to-zinc-900 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-bold text-teal-300 border border-white/10">
              Active CRM Account
            </span>
          </div>
        </div>

        {/* Profile Info Overlay */}
        <div className="relative px-6 pb-6 pt-0 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4 -mt-12">
            {/* Avatar Circle */}
            <div className="relative">
              <div className="flex h-24 w-24 flex-none items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-black text-white shadow-xl ring-4 ring-white">
                {initials(profile.name || "U")}
              </div>
              <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white" title="Active" />
            </div>

            <div className="pb-1">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                {profile.name || "User Profile"}
              </h1>
              <p className="text-xs text-zinc-500 font-semibold flex items-center gap-2">
                <span>{profile.email}</span>
                {company.company && <span className="text-teal-700 font-bold">· {company.company}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-extrabold text-teal-800 border border-teal-200/80">
              Account Admin
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 border-t border-zinc-100 bg-zinc-50/40 py-2">
          {[
            { id: "personal", label: "Personal Profile", icon: "👤" },
            { id: "company", label: "Company Info", icon: "🏢" },
            { id: "security", label: "Security & Password", icon: "🔒" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 1: Personal Information ─────────────────────────────────── */}
      {activeTab === "personal" && (
        <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900">Personal Profile Details</h2>
                <p className="text-xs text-zinc-400">Update your name, contact information, and email</p>
              </div>
            </div>
          </div>

          {profileError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 font-medium">{profileError}</div>}
          {profileMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 font-bold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {profileMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Full / Profile Name *</label>
              <input required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputCls} placeholder="e.g. John Smith" />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="e.g. 9876543210" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email Address *</label>
            <input required type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputCls} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button type="submit" disabled={profileSaving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60 transition-colors shadow-2xs">
              {profileSaving ? "Saving..." : "Save Profile Changes"}
            </button>
          </div>
        </form>
      )}

      {/* ── Tab 2: Company Information ──────────────────────────────────── */}
      {activeTab === "company" && (
        <form onSubmit={handleCompanySubmit} className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900">Company &amp; Organization Profile</h2>
                <p className="text-xs text-zinc-400">Configure your business details and operating parameters</p>
              </div>
            </div>
          </div>

          {companyError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 font-medium">{companyError}</div>}
          {companyMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 font-bold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {companyMessage}
            </div>
          )}

          <div>
            <label className={labelCls}>Company Name *</label>
            <input required value={company.company} onChange={(e) => setCompany({ ...company, company: e.target.value })} className={inputCls} placeholder="e.g. FXpertise Travel & Forex" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Company Website</label>
              <input value={company.companyWebsite} onChange={(e) => setCompany({ ...company, companyWebsite: e.target.value })} placeholder="https://fxpertise.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Industry Sector</label>
              <input value={company.companyIndustry} onChange={(e) => setCompany({ ...company, companyIndustry: e.target.value })} placeholder="Forex, Financial Services, Travel" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Operating Timezone</label>
            <input value={company.companyTimezone} onChange={(e) => setCompany({ ...company, companyTimezone: e.target.value })} placeholder="Asia/Kolkata (IST)" className={inputCls} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button type="submit" disabled={companySaving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60 transition-colors shadow-2xs">
              {companySaving ? "Saving..." : "Save Company Changes"}
            </button>
          </div>
        </form>
      )}

      {/* ── Tab 3: Security & Password Management ───────────────────────── */}
      {activeTab === "security" && (
        <form onSubmit={handlePasswordSubmit} className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900">Account Security &amp; Password</h2>
                <p className="text-xs text-zinc-400">Update your login password and review session security</p>
              </div>
            </div>
          </div>

          {passwordError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 font-medium">{passwordError}</div>}
          {passwordMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 font-bold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {passwordMessage}
            </div>
          )}

          <div>
            <label className={labelCls}>Current Password *</label>
            <div className="relative">
              <input
                required
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`${inputCls} pr-10`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-600"
              >
                {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>New Password *</label>
              <div className="relative">
                <input
                  required
                  type={showNewPassword ? "text" : "password"}
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputCls} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-600"
                >
                  {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400 font-medium">At least 8 characters</p>
            </div>

            <div>
              <label className={labelCls}>Confirm New Password *</label>
              <div className="relative">
                <input
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputCls} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-600"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button type="submit" disabled={passwordSaving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60 transition-colors shadow-2xs">
              {passwordSaving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
