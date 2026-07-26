"use client";
import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2 } from 'lucide-react';
import { registerUser, verifyEmailOtp } from "@/app/actions/auth";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import OtpInput from "./OtpInput";

interface SignUpFormProps {
  onNavigate: (view: string) => void;
  onSuccess: () => void;
}

export default function SignUpForm({ onNavigate, onSuccess }: SignUpFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const router = useRouter();

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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedEmail) return;

    setError(null);
    setLoading(true);

    try {
      await verifyEmailOtp(submittedEmail, otp);
      const result = await signIn("credentials", {
        email: submittedEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Email verified, but automatic sign-in failed. Please sign in manually.");
      }

      onSuccess();
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="w-full text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-[var(--color-canvas-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-serif text-[var(--color-text-primary)] mb-3">Enter your code</h2>
        <p className="text-[var(--color-text-secondary)] text-sm mb-8">
          We sent a 6-digit verification code to {submittedEmail}.
        </p>
        <form className="space-y-5" onSubmit={handleVerifyOtp}>
          <div className="flex justify-center">
            <OtpInput value={otp} onChange={setOtp} id="signup-otp" />
          </div>

          <Alert tone="info">
            Didn&apos;t get the email? Check your <strong>spam</strong> or <strong>promotions</strong> folder, then try again.
          </Alert>

          {error && <Alert tone="error">{error}</Alert>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
          >
            {loading ? 'Verifying...' : 'Verify and Sign In'}
          </Button>
        </form>
        <button
          onClick={() => onNavigate('signin')}
          className="mt-6 text-sm font-medium text-[var(--color-text-primary)] underline underline-offset-4 hover:text-[var(--color-text-secondary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] rounded"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-[var(--color-text-primary)] mb-2">Join STUDIO.V</h1>
        <p className="text-[var(--color-text-secondary)] text-sm">Create your brand&apos;s interactive showroom today.</p>
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
            <div className="flex-1 flex gap-1 h-1">
              <div className={`flex-1 rounded-full ${strength >= 1 ? 'bg-amber-500' : 'bg-[var(--color-border-default)]'}`}></div>
              <div className={`flex-1 rounded-full ${strength >= 2 ? 'bg-amber-500' : 'bg-[var(--color-border-default)]'}`}></div>
              <div className={`flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-[var(--color-border-default)]'}`}></div>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--color-text-muted)]">
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
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>

        <p className="text-xs text-[var(--color-text-muted)] text-center mt-4">
          By signing up, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-text-primary)] focus-visible:outline-[var(--color-text-primary)]">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-text-primary)] focus-visible:outline-[var(--color-text-primary)]">Privacy Policy</a>.
        </p>
      </form>

      <div className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
        Already have an account?{' '}
        <button
          onClick={() => onNavigate('signin')}
          className="font-medium text-[var(--color-text-primary)] underline underline-offset-4 hover:text-[var(--color-text-secondary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] rounded"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}