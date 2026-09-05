"use client";

import React from "react";
import { useReducedMotion } from "framer-motion";

// Honest compatibility strip: platforms the one-line iframe works on.
// These are integration facts, not customer claims.
const PLATFORMS = ["Shopify", "WooCommerce", "Webflow", "Custom"] as const;

export default function CategoryStrip() {
  const reduce = useReducedMotion();
  return (
    <section
      aria-label="Works on"
      className="relative overflow-hidden"
      style={{
        background: "var(--canvas)",
        borderTop: "1px solid var(--border-default)",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
        <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--text-muted)] shrink-0">
          Works on
        </span>

        {/* Desktop: inline list */}
        <div className="hidden sm:flex items-center gap-4">
          {PLATFORMS.map((platform, i) => (
            <React.Fragment key={platform}>
              <span className="font-sans font-semibold text-[18px] sm:text-[20px] tracking-[-0.01em] text-[var(--text-primary)]">
                {platform}
              </span>
              {i < PLATFORMS.length - 1 && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
          <span className="font-sans text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--text-muted)] ml-1">one-line iframe</span>
        </div>

        {/* Mobile: marquee (static wrapped list when reduced motion) */}
        <div className="sm:hidden relative w-full overflow-hidden">
          {reduce ? (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
              {PLATFORMS.map((platform, i) => (
                <React.Fragment key={platform}>
                  <span className="font-sans font-semibold text-[16px] tracking-[-0.01em] text-[var(--text-primary)] whitespace-nowrap">
                    {platform}
                  </span>
                  {i < PLATFORMS.length - 1 && (
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--accent)" }} aria-hidden="true" />
                  )}
                </React.Fragment>
              ))}
              <span className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] whitespace-nowrap">one-line iframe</span>
            </div>
          ) : (
            <div className="flex w-max animate-[marquee_22s_linear_infinite] items-center gap-4">
              {[...PLATFORMS, ...PLATFORMS].map((platform, i) => (
                <React.Fragment key={`${platform}-${i}`}>
                  <span
                    aria-hidden={i >= PLATFORMS.length}
                    className="font-sans font-semibold text-[16px] tracking-[-0.01em] text-[var(--text-primary)] whitespace-nowrap"
                  >
                    {platform}
                  </span>
                  <span className="w-1 h-1 rounded-full shrink-0 bg-[var(--accent)]" aria-hidden="true" />
                </React.Fragment>
              ))}
              <span className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] whitespace-nowrap">one-line iframe</span>
              <span className="w-1 h-1 rounded-full shrink-0 bg-[var(--accent)]" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
      <p className="sr-only">Built for furniture, jewelry, apparel and decor storefronts.</p>
    </section>
  );
}
