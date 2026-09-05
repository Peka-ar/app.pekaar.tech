"use client";

import React, { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from "framer-motion";
import Reveal from "./Reveal";

const STEPS = [
  {
    n: "01",
    eyebrow: "Send",
    title: "Send product photos",
    body: "Standard product photography plus dimensions — phone photos work. No studio rig, no 3D files, no 3D staff.",
  },
  {
    n: "02",
    eyebrow: "Finish",
    title: "We draft, artists finish",
    body: "Our pipeline drafts the model in minutes, then a 3D artist refines it by hand and checks it at true 1:1 scale. Never raw AI output.",
  },
  {
    n: "03",
    eyebrow: "Embed",
    title: "One line, live + AR",
    body: "Paste one iframe line on any storefront. Shoppers rotate, zoom, and preview it in their own room on iOS and Android — hours after you sent photos.",
  },
] as const;

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.85", "end 0.45"],
  });
  const [activeStep, setActiveStep] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActiveStep(v < 0.4 ? 0 : v < 0.75 ? 1 : 2);
  });

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="py-12 sm:py-16 lg:py-20 scroll-mt-16"
      style={{ background: "var(--surface-sky)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mb-8 sm:mb-10">
          <p className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--text-secondary)] mb-3">
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="font-display font-bold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(1.875rem, 4vw, 2.5rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              textWrap: "balance",
            }}
          >
            Photos in. 3D out. Live on your storefront in hours.
          </h2>
          <p className="font-sans text-[14px] sm:text-[15px] leading-[1.6] text-[var(--text-secondary)] mt-3">
            A managed pipeline — AI drafts, artists finish, we serve. You do the photos; we handle the rest.
          </p>
        </Reveal>

        <div className="relative">
          {/* connecting line desktop — static hairline + scroll-scrubbed accent draw */}
          <div
            className="hidden lg:block absolute left-0 right-0 top-[28px] h-px"
            style={{ background: "rgba(14,15,12,0.12)" }}
            aria-hidden="true"
          />
          {!reduce && (
            <motion.div
              className="hidden lg:block absolute left-0 right-0 top-[28px] h-[2px] origin-left"
              style={{ background: "var(--accent)", scaleX: scrollYProgress }}
              aria-hidden="true"
            />
          )}
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none m-0 p-0">
            {STEPS.map((s, i) => {
              const reached = reduce || i <= activeStep;
              return (
                <Reveal key={s.n} delay={i * 0.1} className="h-full">
                  <li
                    className="relative rounded-[24px] p-6 sm:p-7 flex flex-col gap-3 h-full transition-opacity duration-500"
                    style={{ background: "var(--canvas)", opacity: reached ? 1 : 0.5 }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-sans text-[12px] font-semibold tracking-[0.08em]"
                        style={{ color: reached ? "var(--ink-deep)" : "var(--text-muted)" }}
                      >
                        {s.n}
                      </span>
                      <span
                        className="w-1 h-1 rounded-full shrink-0 transition-colors"
                        style={{ background: reached ? "var(--accent)" : "var(--border-default)" }}
                        aria-hidden="true"
                      />
                      <span className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)]">
                        {s.eyebrow}
                      </span>
                    </div>
                    <h3 className="font-sans font-semibold text-[18px] sm:text-[20px] leading-[1.25] tracking-[-0.015em] text-[var(--text-primary)]">
                      {s.title}
                    </h3>
                    <p className="font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">{s.body}</p>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
