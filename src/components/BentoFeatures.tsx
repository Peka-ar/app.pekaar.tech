import React from "react";
import { Code2, Maximize2, Puzzle, Layers } from "lucide-react";
import Reveal from "./landing/Reveal";

export default function BentoFeatures() {
  return (
    <section
      id="features"
      className="py-16 sm:py-20"
      style={{ background: "var(--canvas)", borderTop: "1px solid var(--border-default)" }}
      aria-labelledby="capabilities-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-3xl mb-10 sm:mb-12 text-left">
          <p className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-3">
            Capabilities
          </p>
          <h2
            id="capabilities-heading"
            className="font-display font-bold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(1.875rem, 4vw, 3rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              textWrap: "balance",
            }}
          >
            Built to ship 3D to your storefront — without the heavy lift.
          </h2>
          <p className="font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)] mt-3" style={{ textWrap: "balance" }}>
            One pipeline, two formats, any storefront. Artist-finished models that load fast and look right at real size.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Large card — Zero-friction embed (sage feature card) */}
          <Reveal className="md:col-span-2 h-full">
          <div className="rounded-[24px] p-7 sm:p-8 flex flex-col gap-4 h-full" style={{ background: "var(--canvas-soft)" }}>
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--canvas)" }}
              aria-hidden="true"
            >
              <Code2 className="w-5 h-5" style={{ color: "var(--ink-deep)" }} />
            </span>
            <h3 className="font-sans font-semibold text-[18px] sm:text-[20px] leading-[1.25] tracking-[-0.015em] text-[var(--text-primary)]">
              Zero-friction embed
            </h3>
            <p className="font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">
              Drop one iframe line on any storefront — Shopify, WooCommerce, Webflow, or custom. No plugins, no app.
            </p>
            <div
              className="rounded-[12px] px-4 py-3 font-mono text-[12px] sm:text-[13px] leading-[1.5] overflow-x-auto"
              style={{ background: "var(--canvas)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
            >
              &lt;iframe src=&quot;https://pekar.tech/embed/<span style={{ color: "var(--ink-deep)" }}>your-project</span>&quot; allow=&quot;xr-spatial-tracking&quot; /&gt;
            </div>
          </div>
          </Reveal>

          {/* Forest card — Calibrated 1:1 scale */}
          <Reveal delay={0.1} className="h-full">
          <div
            className="rounded-[24px] p-7 sm:p-8 flex flex-col gap-4 h-full"
            style={{ background: "var(--forest)", border: "1px solid rgba(232,235,230,.12)" }}
          >
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(232,235,230,.08)", border: "1px solid rgba(232,235,230,.16)" }}
              aria-hidden="true"
            >
              <Maximize2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </span>
            <h3 className="font-sans font-semibold text-[18px] sm:text-[20px] leading-[1.25] tracking-[-0.015em] text-[var(--on-forest)]">
              Calibrated 1:1 scale
            </h3>
            <p className="font-sans text-[14px] leading-[1.5] text-[var(--on-forest)]/70">
              USDZ + GLB mapped to real-world units — customers see true size before they buy.
            </p>
          </div>
          </Reveal>

          {/* Butter card — Adaptive embeds (secondary warm surface) */}
          <Reveal delay={0.15} className="h-full">
          <div
            className="rounded-[24px] p-7 sm:p-8 flex flex-col gap-4 h-full"
            style={{ background: "var(--surface-butter)" }}
          >
            <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--canvas)" }} aria-hidden="true">
              <Puzzle className="w-5 h-5" style={{ color: "var(--surface-butter-deep)" }} />
            </span>
            <h3 className="font-sans font-semibold text-[18px] sm:text-[20px] leading-[1.25] tracking-[-0.015em] text-[var(--text-primary)]">
              Adaptive embeds
            </h3>
            <p className="font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">
              Responsive iframe that fits your product template — sandboxed, styled by your theme, not ours.
            </p>
          </div>
          </Reveal>

          {/* Sky card — Optimized + CDN-served (secondary cool surface) */}
          <Reveal delay={0.2} className="md:col-span-2 h-full">
          <div className="rounded-[24px] p-7 sm:p-8 flex flex-col gap-4 h-full" style={{ background: "var(--surface-sky)" }}>
            <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--canvas)" }} aria-hidden="true">
              <Layers className="w-5 h-5" style={{ color: "var(--surface-sky-deep)" }} />
            </span>
            <h3 className="font-sans font-semibold text-[18px] sm:text-[20px] leading-[1.25] tracking-[-0.015em] text-[var(--text-primary)]">
              Optimized + CDN-served
            </h3>
            <p className="font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">
              Models are optimized and CDN-served for fast storefront loads — progressive streaming, not heavy downloads.
            </p>
          </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
