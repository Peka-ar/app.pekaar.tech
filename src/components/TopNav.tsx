"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const HIDDEN_ROUTES = ['/dashboard', '/tasks', '/analytics', '/notifications', '/integrations', '/onboarding', '/admin', '/auth', '/billing'];

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact us" },
];

export function TopNav() {
  const pathname = usePathname();
  const shouldHide = HIDDEN_ROUTES.some(route => pathname.startsWith(route));

  if (shouldHide) return null;

  return (
    <header className="bg-[var(--color-canvas)]/80 border-b border-[var(--color-border-default)] sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">

        <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden">
          <Link href="/" aria-label="Peka AR home" className="flex items-center gap-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] rounded-sm">
            <Image src="/peka_logo.png" alt="" width={427} height={429} className="h-8 w-auto shrink-0" />
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
            href="/auth?view=signup"
            className="inline-flex items-center justify-center h-9 sm:h-10 px-4 sm:px-5 text-sm font-semibold rounded-[24px] bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] active:scale-[0.98] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
          >
            Sign up
          </Link>
        </div>

      </div>
    </header>
  );
}
