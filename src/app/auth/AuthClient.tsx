"use client";

import React, { useState } from "react";
import SignInForm from "@/components/auth/SignInForm";
import SignUpForm from "@/components/auth/SignUpForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui/LinkButton";
import { Wordmark } from "@/components/Wordmark";

type AuthView = "signin" | "signup" | "forgot-password";

export default function AuthClient() {
  const [view, setView] = useState<AuthView>("signin");

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)] flex flex-col lg:flex-row font-sans antialiased overflow-hidden">
      {/* Mobile ink header band — brand moment survives mobile */}
      <div className="flex lg:hidden shrink-0 items-center justify-between bg-[var(--ink)] px-6 py-4 text-[var(--on-ink)]">
        <Wordmark className="text-sm font-display font-semibold tracking-[0.22em] uppercase text-[var(--on-ink)]" dotClassName="text-[var(--accent)]" />
        <LinkButton
          href="/"
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          className="text-[var(--on-ink)] hover:bg-white/10 hover:text-[var(--on-ink)] hover:no-underline"
        >
          Back
        </LinkButton>
      </div>

      {/* Left brand panel — constant ink in BOTH themes, delineated by hairline in dark */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] bg-[var(--ink)] text-[var(--on-ink)] flex-col relative overflow-hidden border-r border-[var(--border-default)]">
        <div className="flex h-full flex-col justify-between p-10 xl:p-12">
          <div>
            <Wordmark className="font-display text-lg font-semibold tracking-[0.22em] uppercase text-[var(--on-ink)]" dotClassName="text-[var(--accent)]" />
            <h2
              className="mt-10 max-w-[16ch] font-display text-[clamp(1.625rem,3vw,2.125rem)] font-bold leading-[1.15] tracking-[-0.015em] text-[var(--on-ink)]"
              style={{ textWrap: "balance" }}
            >
              Photos in. Showroom out.
            </h2>
            <ul className="mt-8 space-y-3">
              <li className="flex gap-3 text-sm leading-6 text-[var(--on-ink)]/75">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>One-line iframe embed — no SDK, no API key.</span>
              </li>
              <li className="flex gap-3 text-sm leading-6 text-[var(--on-ink)]/75">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>AR view-in-room on iOS + Android — no app required.</span>
              </li>
              <li className="flex gap-3 text-sm leading-6 text-[var(--on-ink)]/75">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>Artist-finished — draft by pipeline, refined by a 3D artist.</span>
              </li>
            </ul>
          </div>
          <p className="border-t border-white/10 pt-6 font-sans text-[11px] uppercase tracking-[0.12em] text-[var(--on-ink)]/50">
            Peka AR · Photo → 3D pipeline · Hours, not weeks
          </p>
        </div>
      </div>

      {/* Right form panel — canvas ground; form sits in card-content */}
      <div className="flex flex-1 flex-col justify-center bg-[var(--canvas)] px-6 py-10 sm:px-10 sm:py-12 lg:px-12 xl:px-16 relative">
        <LinkButton
          href="/"
          variant="ghost"
          size="sm"
          rightIcon={<ArrowLeft className="h-4 w-4 rotate-180" />}
          className="absolute right-6 top-6 hidden lg:inline-flex sm:right-10 lg:right-12 lg:top-8"
        >
          Back to Home
        </LinkButton>

        <div className="card w-full max-w-[448px] mx-auto p-7 sm:p-8">
          {/* Segmented mode switch — Sign in / Sign up */}
          <div role="tablist" aria-label="Authentication mode" className="mb-8 inline-flex rounded-full border border-[var(--border-default)] bg-[var(--canvas-soft)] p-1">
            <button
              type="button"
              role="tab"
              aria-selected={view === "signin"}
              onClick={() => setView("signin")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] ${view === "signin" ? "bg-[var(--accent-pale)] text-[var(--ink-deep)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "signup"}
              onClick={() => setView("signup")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] ${view === "signup" ? "bg-[var(--accent-pale)] text-[var(--ink-deep)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              Sign up
            </button>
          </div>

          {view === "signin" && <SignInForm onNavigate={(v) => setView(v as AuthView)} />}
          {view === "signup" && <SignUpForm onNavigate={(v) => setView(v as AuthView)} />}
          {view === "forgot-password" && <ForgotPasswordForm onNavigate={(v) => setView(v as AuthView)} />}
        </div>

        <p className="mx-auto mt-6 max-w-[448px] text-center font-sans text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Protected by Appwrite · Peka AR works in hours, not weeks
        </p>
      </div>
    </div>
  );
}