"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const HIDDEN_ROUTES = ['/dashboard', '/tasks', '/analytics', '/notifications', '/integrations', '/onboarding', '/admin'];

export function TopNav() {
  const pathname = usePathname();
  const shouldHide = HIDDEN_ROUTES.some(route => pathname.startsWith(route));

  if (shouldHide) return null;

  return (
    <header className="bg-[var(--color-canvas)]/90 border-b border-[var(--color-border-default)] sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden">
          <Link href="/" className="flex items-center gap-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] rounded-sm">
            <div className="w-8 h-8 rounded-full border border-[var(--color-text-primary)] flex items-center justify-center bg-transparent shrink-0">
              <Box className="w-4 h-4 text-[var(--color-text-primary)]" aria-hidden="true" />
            </div>
            <span className="text-[15px] sm:text-lg font-light tracking-tight font-serif text-[var(--color-text-primary)] shrink-0 hidden sm:block">STUDIO.V</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 ml-6">
             <Link href="#showroom-catalog-panel" className="text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Product</Link>
             <Link href="#features" className="text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Features</Link>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <Link
            href="/auth"
            className="px-4 py-2 bg-[var(--color-canvas)] text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)] border border-transparent rounded-md text-[14px] font-medium hidden sm:block transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
          >
            Sign in
          </Link>
        </div>

      </div>
    </header>
  );
}
