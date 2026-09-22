import React from "react";
import Link from "next/link";
import { Gift, Camera, CalendarCheck } from "lucide-react";
import Reveal from "./Reveal";

// Risk-reversal band: the free pilot model offer.
// Concrete, honest — what you get, what we need, what happens next.
const ROWS = [
  {
    icon: Gift,
    title: "What you get",
    body: "Your first product modeled free — artist-finished GLB + USDZ, live 3D embed and AR view-in-room on your own storefront.",
  },
  {
    icon: Camera,
    title: "What we need",
    body: "Standard product photos plus dimensions. Phone photos work — no studio rig, no 3D files, no 3D staff on your side.",
  },
  {
    icon: CalendarCheck,
    title: "What happens next",
    body: "Sign up, send photos, and see your product live in 3D within hours. Keep it if you love it — no commitment.",
  },
] as const;

export default function PilotOfferBand() {
  return (
    <section id="pilot" aria-labelledby="pilot-heading" className="py-12 sm:py-16 scroll-mt-16" style={{ background: "var(--canvas)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] p-8 sm:p-10 lg:p-12 overflow-hidden" style={{ background: "var(--forest)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-start">
            <Reveal>
              <p className="font-sans text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--on-forest)]/60 mb-3">
                Risk-free pilot
              </p>
              <h2
                id="pilot-heading"
                className="font-display font-bold mb-4"
                style={{
                  fontSize: "clamp(1.875rem, 4vw, 2.75rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  textWrap: "balance",
                  color: "var(--on-forest)",
                }}
              >
                Your first model is <span style={{ color: "var(--accent)" }}>free.</span>
              </h2>
              <p className="font-sans text-[15px] leading-[1.6] text-[var(--on-forest)]/75 max-w-xl" style={{ textWrap: "pretty" }}>
                Don&apos;t take our word for it — put your own product in 3D on your own storefront.
                If it doesn&apos;t impress you, you&apos;ve lost nothing but a few photos.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/auth?view=signup"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-[24px] bg-[var(--accent)] text-[var(--on-accent)] text-[14px] font-semibold hover:bg-[var(--accent-active)] active:bg-[var(--accent-neutral)] active:scale-[0.98] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-forest)]"
                >
                  Sign up
                </Link>
                <a
                  href="#faq"
                  className="btn-support focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-forest)]"
                >
                  Read the FAQ
                </a>
              </div>
            </Reveal>

            <div className="flex flex-col gap-3">
              {ROWS.map((row, i) => (
                <Reveal key={row.title} delay={0.1 + i * 0.1}>
                <div
                  className="rounded-[16px] p-4 sm:p-5 flex gap-3"
                  style={{ background: "rgba(232,235,230,.06)", border: "1px solid rgba(232,235,230,.16)" }}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--accent-pale)" }}
                  >
                    <row.icon className="w-4 h-4" style={{ color: "var(--ink-deep)" }} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-sans font-semibold text-[14px] text-[var(--on-forest)]">{row.title}</p>
                    <p className="font-sans text-[13px] leading-[1.5] text-[var(--on-forest)]/65 mt-1">{row.body}</p>
                  </div>
                </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
