import React from "react";
import Link from "next/link";
import Reveal from "./Reveal";

// Cold-traffic problem → solution. Stats are attributed industry context
// with links — never Peka's own results.
export default function ProblemSolution() {
  return (
    <section
      aria-labelledby="problem-heading"
      className="py-12 sm:py-16"
      style={{ background: "var(--canvas)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Problem */}
          <Reveal>
          <div
            className="rounded-[24px] p-7 sm:p-9 flex flex-col gap-4 h-full"
            style={{ background: "var(--canvas-soft)" }}
          >
            <p className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)]">
              The problem
            </p>
            <h2
              id="problem-heading"
              className="font-sans font-semibold tracking-[-0.015em] text-[var(--text-primary)]"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", lineHeight: 1.15, textWrap: "balance" }}
            >
              Flat product photos leave shoppers guessing.
            </h2>
            <p className="font-sans text-[14px] leading-[1.6] text-[var(--text-secondary)]" style={{ textWrap: "pretty" }}>
              Shoppers can&apos;t tell true size, material, or fit from a gallery — so they hesitate, or buy and
              return. Industry data puts online returns near{" "}
              <a
                href="https://www.mytotalretail.com/article/immersive-technologies-help-retailers-boost-conversions-and-reduce-returns/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors"
              >
                30%, with looks-different-than-expected
              </a>{" "}
              a top reason.
            </p>
          </div>
          </Reveal>

          {/* Solution */}
          <Reveal delay={0.12}>
          <div
            className="rounded-[24px] p-7 sm:p-9 flex flex-col gap-4 h-full"
            style={{ background: "var(--ink)" }}
          >
            <p className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--on-ink)]/60">
              The fix
            </p>
            <h2
              className="font-sans font-semibold tracking-[-0.015em] text-[var(--on-ink)]"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", lineHeight: 1.15, textWrap: "balance" }}
            >
              Let them hold it <span style={{ color: "var(--accent)" }}>before they buy it.</span>
            </h2>
            <p className="font-sans text-[14px] leading-[1.6] text-[var(--on-ink)]/75" style={{ textWrap: "pretty" }}>
              A rotatable 3D model at true 1:1 scale, plus view-in-room AR on iOS and Android. Research by
              Alter Agents, Snap and Publicis Media found{" "}
              <a
                href="https://alteragents.com/the-future-of-shopping-has-arrived-and-its-augmented-reality/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[var(--on-ink)] transition-colors"
              >
                80% of AR shoppers feel more confident
              </a>{" "}
              buying. You send photos — we deliver the whole thing in hours.
            </p>
            <div className="mt-1">
              <Link
                href="/auth"
                className="inline-flex items-center justify-center h-12 px-6 rounded-[24px] bg-[var(--accent)] text-[var(--on-accent)] text-[14px] font-semibold hover:bg-[var(--accent-active)] active:bg-[var(--accent-neutral)] active:scale-[0.98] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-ink)]"
              >
                Book a demo call
              </Link>
            </div>
          </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
