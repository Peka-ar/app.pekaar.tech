"use client";
import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from "@/app/actions/auth";

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
        <div className="w-16 h-16 bg-[#EFEDEA] rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-serif text-[#1A1A1A] mb-3">Check your inbox</h2>
        <p className="text-[#4A4742] text-sm mb-8">
          We&apos;ve sent password reset instructions to your email.
        </p>
        <button 
          onClick={() => onNavigate('signin')}
          className="text-sm font-medium text-[#1A1A1A] underline underline-offset-4 hover:text-[#4A4742] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] rounded"
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
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] hover:text-[#1A1A1A] transition-colors mb-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <h1 className="text-4xl font-serif text-[#1A1A1A] mb-2">Reset Password</h1>
        <p className="text-[#4A4742] text-sm">Enter your email and we&apos;ll send you a link to reset your password.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        
        <div className="space-y-1.5">
          <label htmlFor="reset-email" className="block text-[11px] font-mono tracking-widest uppercase text-[#7A7670] font-bold">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-[#7A7670]" aria-hidden="true" />
            </div>
            <input
              type="email"
              id="reset-email"
              name="email"
              autoComplete="email"
              required
              className="block w-full pl-10 pr-3 py-3 border border-[#E5E2DD] rounded-xl text-sm placeholder-[#A3A3A3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] bg-[#F9F8F6] hover:bg-[#EFEDEA] transition-colors"
              placeholder="you@company.com"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#1A1A1A] hover:bg-[#2A2825] active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
}
