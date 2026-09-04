"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, Box } from "lucide-react";

// Deprecated: Hero uses inline CTAs now. Kept for import compat — renders v2 capsule buttons.
export function ScrollToSandboxButton() {
  return (
    <Link href="/auth" className="btn-primary">
      Start your project <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </Link>
  );
}

export function ARDemoButton() {
  return (
    <a href="#sandbox-anchor" className="btn-secondary">
      <Box className="w-4 h-4" aria-hidden="true" /> Try the live demo
    </a>
  );
}
