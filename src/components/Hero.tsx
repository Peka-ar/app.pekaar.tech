"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import PipelineCard from "./landing/PipelineCard";
import { EASE } from "./landing/Reveal";

// Staged entrance: eyebrow → H1 → sub → CTAs → proof → card (~90ms steps).
// Load animation (not scroll-linked) — the hero is the first viewport.
const RISE = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.05 + i * 0.09, ease: EASE },
  }),
};

export default function Hero() {
  const reduce = useReducedMotion();
  const anim = reduce ? {} : { initial: "hidden", animate: "show" };

  return (
    <section className="relative overflow-hidden" style={{ background: "var(--canvas-soft)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left: headline + copy + CTAs + proof */}
          <div className="max-w-xl">
            <motion.p
              className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4"
              variants={RISE}
              custom={0}
              {...anim}
            >
              3D &amp; AR for D2C storefronts
            </motion.p>

            <motion.h1
              className="display-xl text-[var(--text-primary)] mb-5"
              style={{ textWrap: "balance" }}
              variants={RISE}
              custom={1}
              {...anim}
            >
              Your products in 3D and AR, live on your storefront in hours.
            </motion.h1>

            <motion.p
              className="font-sans text-[var(--text-secondary)] mb-8 max-w-xl"
              style={{ fontSize: "1.125rem", lineHeight: 1.6, textWrap: "pretty" }}
              variants={RISE}
              custom={2}
              {...anim}
            >
              Peka AR is a managed 3D team for D2C brands. Send standard product photos — we deliver an
              artist-finished 3D model you embed with one line, viewable in your customers&apos; rooms.
              First model free.
            </motion.p>

            <motion.div className="flex flex-col sm:flex-row gap-3 mb-3" variants={RISE} custom={3} {...anim}>
              <Link href="/auth?view=signup" className="btn-primary inline-flex justify-center">
                Sign up
              </Link>
              <a href="#sandbox-anchor" className="btn-tertiary inline-flex justify-center">
                See live 3D
              </a>
            </motion.div>
            <motion.p
              className="font-sans text-[13px] text-[var(--text-muted)] mb-8"
              style={{ textWrap: "pretty" }}
              variants={RISE}
              custom={4}
              {...anim}
            >
              First model free · No 3D files or studio needed · iOS + Android AR
            </motion.p>

            {/* Proof line — attributed third-party research, never Peka's own claim */}
            <motion.div
              className="grid grid-cols-3 gap-4 pt-6"
              style={{ borderTop: "1px solid rgba(14,15,12,0.15)" }}
              variants={RISE}
              custom={5}
              {...anim}
            >
              <div className="flex flex-col gap-1">
                <span className="font-sans font-semibold text-[18px] sm:text-[20px] leading-none text-[var(--text-primary)]">
                  Hours
                </span>
                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">photo to live embed</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-sans font-semibold text-[18px] sm:text-[20px] leading-none text-[var(--text-primary)]">
                  1 line
                </span>
                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">iframe embed</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-sans font-semibold text-[18px] sm:text-[20px] leading-none text-[var(--text-primary)]">
                  GLB + USDZ
                </span>
                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">web + AR formats</span>
              </div>
            </motion.div>
            <motion.p
              className="font-sans text-[12px] leading-relaxed text-[var(--text-muted)] mt-4"
              style={{ textWrap: "pretty" }}
              variants={RISE}
              custom={6}
              {...anim}
            >
              Academic research in{" "}
              <a
                href="https://hbr.org/2022/03/how-augmented-reality-can-and-cant-help-your-brand"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors"
              >
                Harvard Business Review
              </a>{" "}
              found shoppers who used AR were 19.8% more likely to purchase.
            </motion.p>
          </div>

          {/* Right: PipelineCard — staged slightly after the copy */}
          <motion.div
            className="w-full flex justify-center lg:justify-end"
            variants={RISE}
            custom={3}
            {...anim}
          >
            <PipelineCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
