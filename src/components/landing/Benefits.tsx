import React from "react";
import { Timer, HandHeart, Code2 } from "lucide-react";
import Reveal from "./Reveal";

// Outcome-led benefits. Each claim carries its proof beside it:
// attributed third-party research with links — never Peka's own results.
const WELL_TONES: ReadonlyArray<{ fill: string; glyph: string }> = [
  { fill: "var(--accent-pale)", glyph: "var(--ink-deep)" },
  { fill: "var(--surface-peach)", glyph: "var(--surface-peach-deep)" },
  { fill: "var(--surface-sky)", glyph: "var(--surface-sky-deep)" },
];
const BENEFITS = [
  {
    icon: Timer,
    title: "Live in hours, not weeks",
    body: "An agency engagement hires a 3D artist per model. Peka runs a managed team and workflow that completes your model in hours — with visible stages, never a black box.",
    proof: null as React.ReactNode,
  },
  {
    icon: HandHeart,
    title: "Artist-finished, not raw AI",
    body: "AI drafts the model in minutes — that's where the AI stops. A 3D artist refines geometry, materials and scale, then checks it at true 1:1 size before you ever see it.",
    proof: (
      <>
        Academic research in{" "}
        <a
          href="https://hbr.org/2022/03/how-augmented-reality-can-and-cant-help-your-brand"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors"
        >
          Harvard Business Review
        </a>{" "}
        found AR shoppers were 19.8% more likely to purchase.
      </>
    ),
  },
  {
    icon: Code2,
    title: "One line, zero hassle",
    body: "A single iframe embed that works on Shopify, WooCommerce, Webflow or custom stacks — plus view-in-room AR on iOS (Quick Look) and Android (WebXR). No app, no plugins.",
    proof: (
      <>
        Research by Alter Agents, Snap and Publicis Media found{" "}
        <a
          href="https://alteragents.com/the-future-of-shopping-has-arrived-and-its-augmented-reality/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors"
        >
          80% of AR shoppers feel more confident
        </a>{" "}
        buying.
      </>
    ),
  },
] as const;

export default function Benefits() {
  return (
    <section
      id="benefits"
      aria-labelledby="benefits-heading"
      className="py-12 sm:py-16 scroll-mt-16"
      style={{ background: "var(--canvas)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mb-8 sm:mb-10">
          <p className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-3">
            Why brands switch
          </p>
          <h2
            id="benefits-heading"
            className="font-display font-bold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(1.875rem, 4vw, 2.5rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              textWrap: "balance",
            }}
          >
            A 3D team on call, for less than a studio engagement.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.1} className="h-full">
            <article
              className="rounded-[24px] p-7 sm:p-8 flex flex-col gap-4 h-full"
              style={{ background: "var(--canvas-soft)" }}
            >
              <span
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ background: WELL_TONES[i].fill }}
                aria-hidden="true"
              >
                <b.icon className="w-5 h-5" style={{ color: WELL_TONES[i].glyph }} />
              </span>
              <h3 className="font-sans font-semibold text-[18px] sm:text-[20px] leading-[1.25] tracking-[-0.015em] text-[var(--text-primary)]">
                {b.title}
              </h3>
              <p className="font-sans text-[14px] leading-[1.6] text-[var(--text-secondary)]" style={{ textWrap: "pretty" }}>
                {b.body}
              </p>
              {b.proof && (
                <p
                  className="font-sans text-[13px] leading-[1.6] text-[var(--text-muted)] pt-4 mt-auto"
                  style={{ borderTop: "1px solid rgba(14,15,12,0.12)", textWrap: "pretty" }}
                >
                  {b.proof}
                </p>
              )}
            </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
