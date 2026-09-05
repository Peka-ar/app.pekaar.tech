import React from "react";
import { Check } from "lucide-react";

// Proof rail: a compact restatement of the offer right after the
// problem → solution beat. Each item is an offer fact already carried
// elsewhere on the page (pilot, artist QC, formats, ownership) — this
// band is reinforcement, not new claims.
const PROOF_ITEMS = [
  "Free pilot model",
  "Artist-finished",
  "GLB + USDZ formats",
  "You keep the files",
] as const;

export default function ProductProofRail() {
  return (
    <section
      aria-label="What you get with Peka AR"
      className="py-10 sm:py-12"
      style={{ background: "var(--canvas-soft)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
          <h2
            className="font-display font-bold text-[var(--text-primary)] max-w-[640px]"
            style={{
              fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              textWrap: "balance",
            }}
          >
            You run the storefront. We run the 3D.
          </h2>
          <p
            className="font-sans text-[14px] sm:text-[15px] leading-[1.6] text-[var(--text-secondary)] max-w-[520px]"
            style={{ textWrap: "pretty" }}
          >
            A managed team behind your product pages — draft to embed. No 3D hires, no studio, no learning curve.
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-1 list-none m-0 p-0">
            {PROOF_ITEMS.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-2 rounded-full px-3.5 sm:px-4 py-2 bg-[var(--canvas)]"
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--accent-pale)" }}
                  aria-hidden="true"
                >
                  <Check className="w-2.5 h-2.5" style={{ color: "var(--ink-deep)" }} strokeWidth={3} />
                </span>
                <span className="font-sans text-[13px] font-semibold text-[var(--text-primary)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
