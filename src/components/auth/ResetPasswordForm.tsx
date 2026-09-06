"use client";

import { resetPassword } from "@/app/actions/auth";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Card, CardBody } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export default function ResetPasswordForm({ userId, secret }: { userId: string; secret: string }) {
  const [error, setError] = useState<string | null>(
    userId && secret ? null : "Reset link is invalid or expired."
  );
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;

    try {
      await resetPassword(userId, secret, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 sm:p-10">
      <CardBody className="p-0">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Reset password</h1>
        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-pale)]">
              <span aria-hidden className="h-3 w-3 rounded-full bg-[var(--positive)]" />
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">Your password has been updated. You can now sign in with your new password.</p>
            <LinkButton href="/auth" variant="primary" className="mt-8">
              Sign In
            </LinkButton>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
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
              disabled={loading || !userId || !secret}
              isLoading={loading}
              className="w-full"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}