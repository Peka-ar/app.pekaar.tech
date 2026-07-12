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
    <main className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-6 text-[#1A1A1A]">
      <div className="max-w-md w-full rounded-[2rem] bg-white border border-[#E5E2DD] p-10 text-center shadow-sm">
        <h1 className="text-3xl font-serif mb-3">{error ? "Unable to verify" : "Email verified"}</h1>
        <p className="text-sm text-[#4A4742] mb-8">
          {error || "Your STUDIO.V account is active. You can now sign in."}
        </p>
        <Link href="/auth" className="inline-flex px-6 py-3 bg-[#1A1A1A] text-white rounded-full text-[11px] uppercase tracking-widest font-bold">
          Sign In
        </Link>
      </div>
    </main>
  );
}
