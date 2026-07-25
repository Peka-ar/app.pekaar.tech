"use client";
import React, { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { preflightLogin } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface SignInFormProps {
  onNavigate: (view: string) => void;
}

type UserRole = "BRAND" | "ADMIN";

function postLoginPath(onboarded: boolean, role: UserRole): string {
  if (!onboarded) return "/onboarding";
  return role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
}

export default function SignInForm({ onNavigate }: SignInFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const finishSignIn = async (
    email: string,
    password: string,
    onboarded: boolean,
    role: UserRole,
  ) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error("Sign-in failed. Please try again.");
    }

    router.push(postLoginPath(onboarded, role));
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const preflight = await preflightLogin(email, password);

      if (preflight.status !== "valid") {
        setError("Invalid email or password.");
        return;
      }

      await finishSignIn(email, password, preflight.onboarded, preflight.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
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

        <FormField label="Email Address" htmlFor="email">
          <Input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            leftIcon={<Mail className="h-4 w-4" />}
          />
        </FormField>

        <FormField label="Password" htmlFor="password">
          <div className="flex items-center justify-between">
            <Input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
            />
          </div>
        </FormField>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate('forgot-password')}
            className="text-[11px] text-[#4A4742] hover:text-[#1A1A1A] underline underline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] rounded"
          >
            Forgot?
          </button>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={loading}
        >
          Sign In
        </Button>
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