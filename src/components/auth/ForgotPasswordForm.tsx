"use client";
import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface ForgotPasswordFormProps {
  onNavigate: (view: string) => void;
}

export default function ForgotPasswordForm({ onNavigate }: ForgotPasswordFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request password reset");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-pale)]">
          <CheckCircle2 className="h-6 w-6 text-[var(--positive-deep)]" />
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Check your inbox</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          We&apos;ve sent password reset instructions to your email.
        </p>
        <button
          onClick={() => onNavigate('signin')}
          className="mt-8 text-sm font-medium text-[var(--ink-deep)] underline underline-offset-4 hover:opacity-80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] rounded"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <button
          onClick={() => onNavigate('signin')}
          className="mb-6 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] rounded"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Reset password</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Enter your email and we&apos;ll send you a link to reset your password.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>

        <FormField label="Email Address" htmlFor="reset-email">
          <Input
            type="email"
            id="reset-email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            leftIcon={<Mail className="h-4 w-4" />}
          />
        </FormField>

        {error && <Alert tone="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={loading}
          className="w-full"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
    </div>
  );
}