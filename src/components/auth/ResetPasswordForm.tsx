"use client";

import { resetPassword } from "@/app/actions/auth";
import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(token ? null : "Reset token is missing.");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full rounded-[2rem] bg-white border border-[#E5E2DD] p-10 shadow-sm">
      <h1 className="text-3xl font-serif mb-3">Reset password</h1>
      {success ? (
        <div>
          <p className="text-sm text-[#4A4742] mb-8">Your password has been updated.</p>
          <Link href="/auth" className="inline-flex px-6 py-3 bg-[#1A1A1A] text-white rounded-full text-[11px] uppercase tracking-widest font-bold">
            Sign In
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            placeholder="New password"
            className="block w-full px-4 py-3 border border-[#E5E2DD] rounded-xl text-sm bg-[#F9F8F6]"
          />
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-medium text-white bg-[#1A1A1A] disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}
