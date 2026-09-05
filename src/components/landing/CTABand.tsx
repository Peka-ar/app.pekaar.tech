import React from "react";
import Link from "next/link";
import Reveal from "./Reveal";

export default function CTABand() {
  return (
    <section className="py-10 sm:py-12" style={{ background: "var(--canvas)" }} aria-label="Get started">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal y={36}>
        <div
          className="rounded-[24px] p-8 sm:p-12 lg:p-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
          style={{ background: "var(--forest)" }}
        >
          <div>
            <h2
              className="font-display font-bold"
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                textWrap: "balance",
                color: "var(--on-forest)",
              }}
            >
              Get your free pilot model this week.
            </h2>
            <p className="font-sans text-[15px] leading-[1.6] text-[var(--on-forest)]/70 mt-2 max-w-xl" style={{ textWrap: "pretty" }}>
              Book a demo call, send photos, see your product live in 3D within hours. No 3D files needed.
            </p>
          </div>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center h-12 px-7 rounded-[24px] bg-[var(--accent)] text-[var(--on-accent)] text-[14px] font-semibold hover:bg-[var(--accent-active)] active:bg-[var(--accent-neutral)] active:scale-[0.98] transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-forest)]"
          >
            Book a demo call
          </Link>
        </div>
        </Reveal>
      </div>
    </section>
  );
}
