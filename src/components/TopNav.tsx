"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box } from 'lucide-react';
import { Wordmark } from './Wordmark';

const HIDDEN_ROUTES = ['/dashboard', '/tasks', '/analytics', '/notifications', '/integrations', '/onboarding', '/admin', '/auth'];

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#sandbox-anchor", label: "Live 3D" },
  { href: "/#pilot", label: "Free pilot" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#features", label: "Features" },
];

export function TopNav() {
  const pathname = usePathname();
  const shouldHide = HIDDEN_ROUTES.some(route => pathname.startsWith(route));

  if (shouldHide) return null;

  return (
    <header className="bg-[var(--color-canvas)]/80 border-b border-[var(--color-border-default)] sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">

        <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden">
          <Link href="/" className="flex items-center gap-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] rounded-sm">
            <div className="w-8 h-8 rounded-full border border-[var(--color-text-primary)] flex items-center justify-center bg-transparent shrink-0">
              <Box className="w-4 h-4 text-[var(--color-text-primary)]" aria-hidden="true" />
            </div>
            <Wordmark className="text-[15px] sm:text-lg font-semibold tracking-tight font-display text-[var(--color-text-primary)] shrink-0 hidden sm:block" />
          </Link>
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-5 ml-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/auth"
            className="hidden sm:inline-flex items-center justify-center h-10 px-5 text-sm font-semibold rounded-[24px] bg-[var(--color-canvas)] text-[var(--color-text-primary)] border border-[var(--color-border-ink)] hover:bg-[var(--color-canvas-soft)] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
          >
            Sign in
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center h-9 sm:h-10 px-4 sm:px-5 text-sm font-semibold rounded-[24px] bg-[var(--accent)] text-[var(--on-accent)] hover:bg-[var(--accent-active)] active:bg-[var(--accent-neutral)] active:scale-[0.98] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
          >
            Book a demo call
          </Link>
        </div>

      </div>
    </header>
  );
}
