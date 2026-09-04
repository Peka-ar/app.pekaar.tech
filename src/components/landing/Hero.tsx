import React from "react";
import Link from "next/link";
import PipelineCard from "./PipelineCard";

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--canvas)", borderBottom: "1px solid var(--border-default)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left: headline + copy + CTAs + metrics */}
          <div className="max-w-xl">
            <p className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4">
              Photos → Interactive 3D
            </p>

            <h1
              className="font-display font-extrabold text-[var(--text-primary)] mb-4"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                lineHeight: 1.0,
                letterSpacing: "-0.025em",
                textWrap: "balance",
              }}
            >
              Your product photos, live in 3D — in hours, not weeks.
            </h1>

            <p
              className="font-sans text-[var(--text-secondary)] mb-8 max-w-xl"
              style={{ fontSize: "1.125rem", lineHeight: 1.6, textWrap: "pretty" }}
            >
              Peka AR turns your product photography into artist-finished 3D assets — live on your storefront in
              hours, embeddable with one line, viewable in your customers&apos; rooms.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/auth" className="btn-primary inline-flex justify-center">
                Start your project
              </Link>
              <a href="#sandbox-anchor" className="btn-secondary inline-flex justify-center">
                Try the live demo
              </a>
            </div>

            {/* Metrics row — product facts only */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[var(--border-default)]">
              <div className="flex flex-col gap-1">
                <span className="font-display font-semibold text-[18px] sm:text-[20px] leading-none text-[var(--text-primary)]">
                  Hours
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">photo to live embed</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-display font-semibold text-[18px] sm:text-[20px] leading-none text-[var(--text-primary)]">
                  1 line
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">iframe embed</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-display font-semibold text-[18px] sm:text-[20px] leading-none text-[var(--text-primary)]">
                  GLB + USDZ
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">web + AR formats</span>
              </div>
            </div>
          </div>

          {/* Right: PipelineCard */}
          <div className="w-full flex justify-center lg:justify-end">
            <PipelineCard />
          </div>
        </div>
      </div>
    </section>
  );
}
