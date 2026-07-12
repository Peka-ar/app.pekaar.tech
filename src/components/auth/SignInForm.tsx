"use client";
import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { signIn } from "next-auth/react";


interface SignInFormProps {
  onNavigate: (view: string) => void;
}

export default function SignInForm({ onNavigate }: SignInFormProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      window.location.href = "/dashboard";
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

        <button
          type="submit"
          className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#1A1A1A] hover:bg-[#2A2825] active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
        >
          Sign In
        </button>
      </form>

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
