import Link from "next/link";
import { verifyEmail } from "@/app/actions/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let error: string | null = null;

  if (!token) {
    error = "Verification token is missing.";
  } else {
    try {
      await verifyEmail(token);
    } catch (err) {
      error = err instanceof Error ? err.message : "Verification failed.";
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center px-6 text-[var(--color-text-primary)]">
      <div className="max-w-md w-full rounded-[2rem] bg-[var(--color-surface)] border border-[var(--color-border-default)] p-10 text-center shadow-sm">
        <h1 className="text-3xl font-serif mb-3">{error ? "Unable to verify" : "Email verified"}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-8">
          {error || "Your STUDIO.V account is active. You can now sign in."}
        </p>
        <Link href="/auth" className="inline-flex px-6 py-3 bg-[var(--color-text-primary)] text-[var(--color-canvas)] rounded-full text-[11px] uppercase tracking-widest font-bold">
          Sign In
        </Link>
      </div>
    </main>
  );
}
