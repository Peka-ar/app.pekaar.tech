import { Account } from "node-appwrite";
import { createPublicClient } from "@/server/appwrite";
import { LinkButton } from "@/components/ui/LinkButton";

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

  const isError = Boolean(error);

  return (
    <main className="min-h-screen bg-[var(--canvas)] flex items-center justify-center px-6 py-12 text-[var(--text-primary)]">
      <div className="card w-full max-w-md p-8 text-center sm:p-10">
        <div
          aria-hidden="true"
          className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full ${isError ? "bg-[var(--negative-bg)] text-white" : "bg-[var(--accent-pale)] text-[var(--positive-deep)]"}`}
        >
          <span className={`h-3 w-3 rounded-full ${isError ? "bg-[var(--negative)]" : "bg-[var(--positive)]"}`} />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
          {isError ? "Unable to verify" : "Email verified"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{error || "Your account is active. You can now sign in."}</p>
        <LinkButton href="/auth" variant="primary" size="md" className="mt-8">
          Sign In
        </LinkButton>
      </div>
    </main>
  );
}