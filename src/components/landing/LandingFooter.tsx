import React from "react";
import Link from "next/link";
import Image from "next/image";
import Reveal from "./Reveal";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Live 3D demo", href: "/#sandbox-anchor" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Free pilot", href: "/#pilot" },
      { label: "Features", href: "/#features" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Sign up", href: "/auth?view=signup" },
      { label: "Sign in", href: "/auth" },
      { label: "Contact us", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
] as const;

export default function LandingFooter() {
  return (
    <footer
      className="mt-2"
      style={{ background: "var(--ink)", borderTop: "1px solid rgba(232,235,230,.12)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <Reveal y={16}>
        <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr] gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Image src="/peka_logo.png" alt="Peka AR" width={427} height={429} className="h-7 w-auto shrink-0" />
            </div>
            <p className="font-sans text-[13px] leading-relaxed text-[var(--on-ink)]/60 max-w-xs" style={{ textWrap: "pretty" }}>
              Product photos → interactive 3D. Artist-finished models, live on your storefront in hours.
            </p>
            <p className="font-sans text-[11px] tracking-wide text-[var(--on-ink)]/55">GLB + USDZ · one-line iframe · AR view-in-room</p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={`Footer — ${col.title}`}>
              <p className="font-sans text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--on-ink)]/50 mb-4">
                {col.title}
              </p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="font-sans text-[14px] text-[var(--on-ink)]/70 hover:text-[var(--on-ink)] transition-colors underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-ink)] rounded"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div
          className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(232,235,230,.12)" }}
        >
          <p className="font-sans text-[12px] text-[var(--on-ink)]/55 text-center sm:text-left">
            © {new Date().getFullYear()} Peka AR · pekar.tech · Demo models labeled; no fabricated claims.
          </p>
          <p className="font-sans text-[11px] tracking-wide text-[var(--on-ink)]/55 text-center sm:text-right" style={{ textWrap: "pretty" }}>
            Third-party stats cited belong to their publishers and are linked beside each claim.
          </p>
        </div>
        </Reveal>
      </div>
    </footer>
  );
}
