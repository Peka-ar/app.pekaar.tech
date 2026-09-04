import React from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function LandingFooter() {
  return (
    <footer
      className="mt-2"
      style={{ background: "var(--ink)", borderTop: "1px solid rgba(228,230,220,.12)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
              style={{ border: "1px solid rgba(228,230,220,.5)", color: "var(--on-ink)" }}
              aria-hidden="true"
            >
              P
            </div>
            <Wordmark className="font-display font-semibold tracking-tight text-sm text-[var(--on-ink)]" dotClassName="text-[var(--accent)]" />
            <span className="hidden sm:inline font-sans text-[13px] text-[var(--on-ink)]/60 ml-2">
              Product photos → interactive 3D
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] tracking-widest uppercase">
            <span className="text-[var(--on-ink)]/50">W3C WebXR</span>
            <span aria-hidden="true" className="text-[var(--on-ink)]/20">•</span>
            <span className="text-[var(--on-ink)]/50">CORS Assets</span>
            <span aria-hidden="true" className="text-[var(--on-ink)]/20">•</span>
            <span className="text-[var(--on-ink)]/50">Model-Viewer 4.0</span>
            <span aria-hidden="true" className="text-[var(--on-ink)]/20">•</span>
            <Link
              href="/privacy"
              className="text-[var(--on-ink)]/70 hover:text-[var(--on-ink)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-ink)] rounded"
            >
              Privacy
            </Link>
            <span aria-hidden="true" className="text-[var(--on-ink)]/20">•</span>
            <Link
              href="/terms"
              className="text-[var(--on-ink)]/70 hover:text-[var(--on-ink)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-ink)] rounded"
            >
              Terms
            </Link>
          </div>
        </div>

        <div
          className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(228,230,220,.12)" }}
        >
          <p className="font-sans text-[12px] text-[var(--on-ink)]/45 text-center sm:text-left">
            © {new Date().getFullYear()} Peka AR · pekar.tech · Demo models labeled; no fabricated claims.
          </p>
          <p className="font-mono text-[11px] tracking-wide text-[var(--on-ink)]/35">GLB + USDZ · one-line iframe · AR view-in-room</p>
        </div>
      </div>
    </footer>
  );
}
