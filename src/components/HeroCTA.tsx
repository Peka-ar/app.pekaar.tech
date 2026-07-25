"use client";
import React from 'react';
import { ArrowRight, Box } from 'lucide-react';
import Link from 'next/link';

export function ScrollToSandboxButton() {
  return (
    <Link
      href="/auth"
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[var(--accent-1)] text-white rounded-md text-[14px] font-medium px-6 h-[40px] active:scale-95 transition-colors duration-200 hover:bg-[var(--accent-2)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] shadow-sm"
    >
      Get started
      <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

export function ARDemoButton() {
  return (
    <a
      href="#showroom-catalog-panel"
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[var(--color-canvas)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] rounded-md text-[14px] font-medium px-6 h-[40px] hover:border-[var(--accent-1)] hover:text-[var(--accent-1)] transition-colors duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
    >
      <Box className="w-4 h-4" />
      View demo
    </a>
  );
}
