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
        <div className="w-16 h-16 bg-[var(--color-canvas-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-serif text-[var(--color-text-primary)] mb-3">Check your inbox</h2>
        <p className="text-[var(--color-text-secondary)] text-sm mb-8">
          We&apos;ve sent password reset instructions to your email.
        </p>
        <button
          onClick={() => onNavigate('signin')}
          className="text-sm font-medium text-[var(--color-text-primary)] underline underline-offset-4 hover:text-[var(--color-text-secondary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] rounded"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <button
          onClick={() => onNavigate('signin')}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <h1 className="text-4xl font-serif text-[var(--color-text-primary)] mb-2">Reset Password</h1>
        <p className="text-[var(--color-text-secondary)] text-sm">Enter your email and we&apos;ll send you a link to reset your password.</p>
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
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
    </div>
  );
}