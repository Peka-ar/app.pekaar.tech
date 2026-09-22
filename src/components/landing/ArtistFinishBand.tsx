import React from "react";
import Link from "next/link";
import { Check, Sparkles, ShieldCheck } from "lucide-react";
import Reveal from "./Reveal";

export default function ArtistFinishBand() {
  return (
    <section className="py-12 sm:py-16" style={{ background: "var(--canvas-soft)" }} aria-label="Artist-finished, not raw AI">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="rounded-[24px] p-8 sm:p-10 lg:p-12 overflow-hidden"
          style={{ background: "var(--ink)" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-start">
            <Reveal>
              <p className="font-sans text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--on-ink)]/60 mb-3">
                Artist-finished, not raw AI
              </p>
              <h2
                className="font-display font-bold mb-4"
                style={{
                  fontSize: "clamp(1.875rem, 4vw, 2.75rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  textWrap: "balance",
                  color: "var(--on-ink)",
                }}
              >
                Drafted by AI. <span style={{ color: "var(--accent)" }}>Finished by hand.</span>
              </h2>
              <p className="font-sans text-[15px] leading-[1.6] text-[var(--on-ink)]/75 max-w-xl">
                Raw generative output doesn&apos;t ship. Every model passes through a 3D artist who checks scale, cleans
                topology, bakes materials, and optimizes for fast, faithful delivery on your storefront.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/auth?view=signup"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-[24px] bg-[var(--accent)] text-[var(--on-accent)] text-[14px] font-semibold hover:bg-[var(--accent-active)] active:bg-[var(--accent-neutral)] active:scale-[0.98] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-ink)]"
                >
                  Sign up
                </Link>
                <a
                  href="#sandbox-anchor"
                  className="btn-support focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-ink)]"
                >
                  See the demo
                </a>
              </div>
            </Reveal>

            <div className="flex flex-col gap-3">
              <Reveal delay={0.1}>
              <div
                className="rounded-[16px] p-4 sm:p-5 flex gap-3"
                style={{ background: "rgba(232,235,230,.06)", border: "1px solid rgba(232,235,230,.16)" }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-pale)" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "var(--ink-deep)" }} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-sans font-semibold text-[14px] text-[var(--on-ink)]">Draft → refine → optimize</p>
                  <p className="font-sans text-[13px] leading-[1.5] text-[var(--on-ink)]/65 mt-1">
                    AI builds the draft in minutes; an artist refines geometry, materials, and scale to match your reference photos.
                  </p>
                </div>
              </div>
              </Reveal>

              <Reveal delay={0.2}>
              <div
                className="rounded-[16px] p-4 sm:p-5 flex gap-3"
                style={{ background: "rgba(232,235,230,.06)", border: "1px solid rgba(232,235,230,.16)" }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-pale)" }}>
                  <Check className="w-4 h-4" style={{ color: "var(--ink-deep)" }} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-sans font-semibold text-[14px] text-[var(--on-ink)]">QC at 1:1 scale</p>
                  <p className="font-sans text-[13px] leading-[1.5] text-[var(--on-ink)]/65 mt-1">
                    Checked in-viewer at true physical size before you ever see it — so sizing disputes disappear.
                  </p>
                </div>
              </div>
              </Reveal>

              <Reveal delay={0.3}>
              <div
                className="rounded-[16px] p-4 sm:p-5 flex gap-3"
                style={{ background: "rgba(232,235,230,.06)", border: "1px solid rgba(232,235,230,.16)" }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-pale)" }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: "var(--positive-deep)" }} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-sans font-semibold text-[14px] text-[var(--on-ink)]">Optimized + AR-ready</p>
                  <p className="font-sans text-[13px] leading-[1.5] text-[var(--on-ink)]/65 mt-1">
                    Web-optimized GLB plus USDZ for Quick Look / WebXR — one iframe line, no app, view-in-room on iOS & Android.
                  </p>
                </div>
              </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
