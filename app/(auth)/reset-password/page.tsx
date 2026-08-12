"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { EyeIcon, EyeOffIcon } from "../../dashboard/icons";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Invalid reset link</h1>
        <p className="mt-2 text-sm text-zinc-500">
          This password reset link is missing or invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-8 inline-block text-sm font-medium text-brand-600 hover:text-brand-500"
        >
          ← Back to forgot password
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="#11b567"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Password updated</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Your password has been reset successfully. You can now log in with your new password.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block text-sm font-medium text-brand-600 hover:text-brand-500"
        >
          ← Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Reset your password</h1>
      <p className="mt-2 text-sm text-zinc-500">Choose a new password for your account.</p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
            New password
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700">
            Confirm new password
          </label>
          <div className="relative mt-1.5">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-600"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-500">
          ← Back to log in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
