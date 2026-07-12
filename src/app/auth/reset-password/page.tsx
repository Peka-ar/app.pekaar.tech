import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-6 text-[#1A1A1A]">
      <ResetPasswordForm token={token || ""} />
    </main>
  );
}
