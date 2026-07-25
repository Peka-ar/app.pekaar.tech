"use client";

import { resetPassword } from "@/app/actions/auth";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

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
    <Card className="max-w-md w-full rounded-[2rem] bg-[var(--color-surface)] border border-[var(--color-border-default)] p-10 shadow-sm">
      <CardBody className="p-0">
        <h1 className="text-3xl font-serif mb-3">Reset password</h1>
        {success ? (
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-8">Your password has been updated.</p>
            <Link href="/auth" className="inline-flex px-6 py-3 bg-[var(--color-text-primary)] text-[var(--color-canvas)] rounded-full text-[11px] uppercase tracking-widest font-bold">
              Sign In
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <FormField label="New Password" htmlFor="new-password">
              <Input
                type="password"
                id="new-password"
                name="password"
                required
                minLength={6}
                placeholder="New password"
              />
            </FormField>
            {error && <Alert tone="error">{error}</Alert>}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || !token}
              isLoading={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}