"use client";
import React, { useState } from 'react';
import { CheckCircle2, Lock, Mail } from 'lucide-react';
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { preflightLogin, resendVerificationOtp, verifyEmailOtp } from "@/app/actions/auth";


interface SignInFormProps {
  onNavigate: (view: string) => void;
}

export default function SignInForm({ onNavigate }: SignInFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [submittedPassword, setSubmittedPassword] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const router = useRouter();

  const finishSignIn = async (email: string, password: string, onboarded?: boolean) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error("Sign-in failed. Please try again.");
    }

    router.push(onboarded === false ? "/onboarding" : "/dashboard");
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setShowOtp(false);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const preflight = await preflightLogin(email, password);

      if (preflight.status === "not_registered") {
        setError("No account found. Create an account first.");
        return;
      }

      if (preflight.status === "invalid_password") {
        setError("That password is incorrect.");
        return;
      }

      if (preflight.status === "unverified") {
        setSubmittedEmail(email);
        setSubmittedPassword(password);
        setNotice("Verify your email to continue. We can send a fresh 6-digit code.");
        return;
      }

      await finishSignIn(email, password, preflight.onboarded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!submittedEmail) return;

    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const result = await resendVerificationOtp(submittedEmail);
      if (!result.success) {
        throw new Error(result.status === "already_verified" ? "This email is already verified. Please sign in again." : "No account found. Create an account first.");
      }

      setShowOtp(true);
      setNotice(`We sent a new verification code to ${submittedEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!submittedEmail || !submittedPassword) return;

    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      await verifyEmailOtp(submittedEmail, otp);
      await finishSignIn(submittedEmail, submittedPassword, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-[#1A1A1A] mb-2">Welcome back.</h1>
        <p className="text-[#4A4742] text-sm">Sign in to manage your 3D assets and integrations.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-[11px] font-mono tracking-widest uppercase text-[#7A7670] font-bold">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-[#7A7670]" aria-hidden="true" />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              required
              className="block w-full pl-10 pr-3 py-3 border border-[#E5E2DD] rounded-xl text-sm placeholder-[#A3A3A3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] bg-[#F9F8F6] hover:bg-[#EFEDEA] transition-colors"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-[11px] font-mono tracking-widest uppercase text-[#7A7670] font-bold">Password</label>
            <button 
              type="button" 
              onClick={() => onNavigate('forgot-password')}
              className="text-[11px] text-[#4A4742] hover:text-[#1A1A1A] underline underline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] rounded"
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-[#7A7670]" aria-hidden="true" />
            </div>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              required
              className="block w-full pl-10 pr-3 py-3 border border-[#E5E2DD] rounded-xl text-sm placeholder-[#A3A3A3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] bg-[#F9F8F6] hover:bg-[#EFEDEA] transition-colors"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800" role="status">
            {notice}
          </div>
        )}

        {submittedEmail && !showOtp && (
          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-[#E5E2DD] rounded-xl text-sm font-medium text-[#1A1A1A] bg-white hover:bg-[#F9F8F6] active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending code...' : 'Send Verification Code'}
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#1A1A1A] hover:bg-[#2A2825] active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Checking...' : 'Sign In'}
        </button>
      </form>

      {showOtp && (
        <form className="mt-5 space-y-4" onSubmit={handleVerifyOtp}>
          <div className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A]">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Enter your verification code
          </div>
          <label htmlFor="signin-otp" className="sr-only">Verification code</label>
          <input
            type="text"
            id="signin-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="block w-full px-4 py-3 border border-[#E5E2DD] rounded-xl text-center text-2xl tracking-[0.35em] font-mono placeholder-[#A3A3A3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] bg-[#F9F8F6] hover:bg-[#EFEDEA] transition-colors"
            placeholder="000000"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#1A1A1A] hover:bg-[#2A2825] active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify and Continue'}
          </button>
        </form>
      )}

      <div className="mt-8 text-center text-sm text-[#4A4742]">
        Don&apos;t have an account?{' '}
        <button 
          onClick={() => onNavigate('signup')}
          className="font-medium text-[#1A1A1A] underline underline-offset-4 hover:text-[#4A4742] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] rounded"
        >
          Request Access
        </button>
      </div>
    </div>
  );
}
