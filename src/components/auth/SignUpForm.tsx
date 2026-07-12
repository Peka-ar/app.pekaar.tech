"use client";
import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2 } from 'lucide-react';
import { registerUser } from "@/app/actions/auth";

interface SignUpFormProps {
  onNavigate: (view: string) => void;
  onSuccess: () => void;
}

export default function SignUpForm({ onNavigate, onSuccess }: SignUpFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  
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
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="w-full text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-[#EFEDEA] rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-serif text-[#1A1A1A] mb-3">Check your email</h2>
        <p className="text-[#4A4742] text-sm mb-8">
          We sent a verification link to {submittedEmail}. Verify your email before signing in.
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
        <h1 className="text-4xl font-serif text-[#1A1A1A] mb-2">Join STUDIO.V</h1>
        <p className="text-[#4A4742] text-sm">Create your brand&apos;s interactive showroom today.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        
        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="block text-[11px] font-mono tracking-widest uppercase text-[#7A7670] font-bold">Work Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-[#7A7670]" aria-hidden="true" />
            </div>
            <input
              type="email"
              id="signup-email"
              name="email"
              autoComplete="email"
              required
              className="block w-full pl-10 pr-3 py-3 border border-[#E5E2DD] rounded-xl text-sm placeholder-[#A3A3A3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] bg-[#F9F8F6] hover:bg-[#EFEDEA] transition-colors"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-[11px] font-mono tracking-widest uppercase text-[#7A7670] font-bold">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-[#7A7670]" aria-hidden="true" />
            </div>
            <input
              type="password"
              id="signup-password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-[#E5E2DD] rounded-xl text-sm placeholder-[#A3A3A3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] bg-[#F9F8F6] hover:bg-[#EFEDEA] transition-colors"
              placeholder="Create a strong password"
            />
          </div>
          
          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className="pt-1 flex items-center gap-2" aria-live="polite">
              <div className="flex-1 flex gap-1 h-1">
                <div className={`flex-1 rounded-full ${strength >= 1 ? 'bg-amber-500' : 'bg-[#E5E2DD]'}`}></div>
                <div className={`flex-1 rounded-full ${strength >= 2 ? 'bg-amber-500' : 'bg-[#E5E2DD]'}`}></div>
                <div className={`flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-[#E5E2DD]'}`}></div>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#7A7670]">
                {strength === 1 && 'Weak'}
                {strength === 2 && 'Good'}
                {strength === 3 && 'Strong'}
              </span>
            </div>
          )}
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
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
        
        <p className="text-xs text-[#7A7670] text-center mt-4">
          By signing up, you agree to our <a href="#" className="underline hover:text-[#1A1A1A] focus-visible:outline-[#1A1A1A]">Terms of Service</a> and <a href="#" className="underline hover:text-[#1A1A1A] focus-visible:outline-[#1A1A1A]">Privacy Policy</a>.
        </p>
      </form>

      <div className="mt-8 text-center text-sm text-[#4A4742]">
        Already have an account?{' '}
        <button 
          onClick={() => onNavigate('signin')}
          className="font-medium text-[#1A1A1A] underline underline-offset-4 hover:text-[#4A4742] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] rounded"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
