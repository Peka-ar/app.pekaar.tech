"use client";
import React, { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { useAuth, useAppwrite } from "@appwrite.io/react";
import { useRouter } from "next/navigation";
import { getSessionPrincipal } from "@/app/actions/auth";
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

function signInErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const code = (err as { code?: number }).code;
    const type = (err as { type?: string }).type;
    if (code === 401 || type === "user_invalid_credentials" || type === "user_not_found") {
      return "Invalid email or password.";
    }
    if (code === 429 || (type && type.includes("rate_limit"))) {
      return "Too many attempts. Please try again later.";
    }
  }
  return err instanceof Error ? err.message : "Sign-in failed";
}

export default function SignInForm({ onNavigate }: SignInFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();
  const { client } = useAppwrite();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await new Promise<void>((resolve, reject) => {
        signIn.emailPassword({
          email,
          password,
          onSuccess: () => resolve(),
          onError: (err) => reject(err),
        });
      });

      const principal = await getSessionPrincipal();
      if (principal?.sessionSecret) client.setSession(principal.sessionSecret);
      router.push(principal ? postLoginPath(principal.onboarded, principal.role) : "/dashboard");
    } catch (err) {
      setError(signInErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-[var(--color-text-primary)] mb-2">Welcome back.</h1>
        <p className="text-[var(--color-text-secondary)] text-sm">Sign in to manage your 3D assets and integrations.</p>
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
            className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] rounded"
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

      <div className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
        Don&apos;t have an account?{' '}
        <button
          onClick={() => onNavigate('signup')}
          className="font-medium text-[var(--color-text-primary)] underline underline-offset-4 hover:text-[var(--color-text-secondary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] rounded"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}