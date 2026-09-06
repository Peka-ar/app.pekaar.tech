"use client";
import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2 } from 'lucide-react';
import { registerUser, resendVerificationEmail } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface SignUpFormProps {
  onNavigate: (view: string) => void;
}

export default function SignUpForm({ onNavigate }: SignUpFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const getPasswordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const form = e.currentTarget as HTMLFormElement;
      const email = (form.elements.namedItem("email") as HTMLInputElement).value;
      await registerUser(new FormData(form));
      setSubmittedEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;

    setError(null);
    setResendState('sending');

    try {
      await resendVerificationEmail(submittedEmail);
      setResendState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend the verification email");
      setResendState('idle');
    }
  };

  if (submittedEmail) {
    return (
      <div className="w-full text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-pale)]">
          <CheckCircle2 className="h-6 w-6 text-[var(--positive-deep)]" />
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Check your inbox</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          We sent a verification link to <strong className="font-semibold text-[var(--text-primary)]">{submittedEmail}</strong>. Click it to activate your account, then sign in.
        </p>

        <Alert tone="info" className="mt-6 text-left">
          Didn&apos;t get the email? Check your <strong>spam</strong> or <strong>promotions</strong> folder, then try again.
        </Alert>

        {resendState === 'sent' && (
          <Alert tone="success" className="mt-4">Verification email sent. Check your inbox.</Alert>
        )}

        {error && <Alert tone="error" className="mt-4">{error}</Alert>}

        <Button
          type="button"
          variant="primary"
          size="md"
          className="mt-6 w-full"
          isLoading={resendState === 'sending'}
          onClick={handleResend}
        >
          Resend verification email
        </Button>

        <button
          onClick={() => onNavigate('signin')}
          className="mt-6 block w-full text-sm font-medium text-[var(--ink-deep)] underline underline-offset-4 hover:opacity-80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] rounded"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Join Peka AR</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Create your brand&apos;s interactive showroom today.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>

        <FormField label="Work Email" htmlFor="signup-email">
          <Input
            type="email"
            id="signup-email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            leftIcon={<Mail className="h-4 w-4" />}
          />
        </FormField>

        <FormField label="Password" htmlFor="signup-password">
          <Input
            type="password"
            id="signup-password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
            leftIcon={<Lock className="h-4 w-4" />}
          />
        </FormField>

        {password.length > 0 && (
          <div className="pt-1 flex items-center gap-2" aria-live="polite">
            <div className="flex h-1 flex-1 gap-1">
              <div className={`flex-1 rounded-full ${strength >= 1 ? 'bg-[var(--warning)]' : 'bg-[var(--border-default)]'}`} />
              <div className={`flex-1 rounded-full ${strength >= 2 ? 'bg-[var(--warning)]' : 'bg-[var(--border-default)]'}`} />
              <div className={`flex-1 rounded-full ${strength >= 3 ? 'bg-[var(--positive)]' : 'bg-[var(--border-default)]'}`} />
            </div>
            <span className="font-sans text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {strength === 1 && 'Weak'}
              {strength === 2 && 'Good'}
              {strength === 3 && 'Strong'}
            </span>
          </div>
        )}

        {error && <Alert tone="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={loading}
          className="w-full"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>

        <p className="mt-4 text-center text-xs leading-5 text-[var(--text-muted)]">
          By signing up, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--border-default)] underline-offset-4 hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] rounded">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--border-default)] underline-offset-4 hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] rounded">Privacy Policy</a>.
        </p>
      </form>

      <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{' '}
        <button
          onClick={() => onNavigate('signin')}
          className="font-medium text-[var(--ink-deep)] underline underline-offset-4 hover:opacity-80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] rounded"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}