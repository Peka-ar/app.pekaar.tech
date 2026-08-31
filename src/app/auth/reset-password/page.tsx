import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const { userId, secret } = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center px-6 text-[var(--color-text-primary)]">
      <ResetPasswordForm userId={userId || ""} secret={secret || ""} />
    </main>
  );
}