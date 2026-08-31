import Link from "next/link";
import { Account } from "node-appwrite";
import { createPublicClient } from "@/server/appwrite";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const { userId, secret } = await searchParams;
  let error: string | null = null;

  if (!userId || !secret) {
    error = "Verification link is invalid or missing.";
  } else {
    try {
      await new Account(createPublicClient()).updateVerification({ userId, secret });
    } catch {
      error = "Verification link is invalid or expired.";
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center px-6 text-[var(--color-text-primary)]">
      <div className="max-w-md w-full rounded-[2rem] bg-[var(--color-surface)] border border-[var(--color-border-default)] p-10 text-center shadow-sm">
        <h1 className="text-3xl font-serif mb-3">{error ? "Unable to verify" : "Email verified"}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-8">
          {error || "Your account is active. You can now sign in."}
        </p>
        <Link href="/auth" className="inline-flex px-6 py-3 bg-[var(--color-text-primary)] text-[var(--color-canvas)] rounded-full text-[11px] uppercase tracking-widest font-bold">
          Sign In
        </Link>
      </div>
    </main>
  );
}