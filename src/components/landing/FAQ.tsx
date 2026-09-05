"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import Reveal from "./Reveal";

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

// Objection handling for cold traffic. Third-party results are attributed
// with links and framed as reported outcomes — never Peka's own claims.
const ITEMS: FaqItem[] = [
  {
    q: "How fast will my model really be live?",
    a: "Hours, not weeks. Send photos and dimensions, and your artist-finished model is typically embedded and live the same day. The demo call sets an exact turnaround for your product.",
  },
  {
    q: "What photos do you need from me?",
    a: "Standard product photography plus width, height and depth. Phone photos work — no studio rig, no 3D files, and no 3D staff on your side.",
  },
  {
    q: "Will it work on my storefront?",
    a: "Yes if your storefront accepts an iframe — that covers Shopify, WooCommerce, Webflow and custom stacks. The embed is sandboxed, responsive, and styled by your theme, not ours.",
  },
  {
    q: "How does the AR view-in-room work?",
    a: "Every model ships as GLB plus USDZ. On iOS shoppers launch Quick Look; on Android they use WebXR or Scene Viewer — true 1:1 scale, no app to install.",
  },
  {
    q: "What if I don't like the model?",
    a: "You request revisions with a note, and our artists rework it until you approve. Nothing goes live until you publish it — and unpublishing for revisions takes the embed down immediately.",
  },
  {
    q: "Who owns the finished 3D model?",
    a: "You do. Once your project is published, the GLB and USDZ are yours to keep and use wherever you like.",
  },
  {
    q: "What results have other brands seen with 3D and AR?",
    a: (
      <>
        Reported outcomes from named brands: Gunner Kennels reported a 40% increase in order conversion and a 5%
        reduction in returns after adding AR via{" "}
        <a
          href="https://www.shopify.com/enterprise/blog/augmented-reality-ecommerce-shopping"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors"
        >
          Shopify
        </a>
        ; IKEA reported a 35% drop in returns and a 14% increase in online sales after launching its AR placement
        app. These are their reported results in size-critical categories — your demo call will cover what to
        expect for your products.
      </>
    ),
  },
  {
    q: "What does the free pilot include?",
    a: "Your first product modeled free: artist-finished GLB plus USDZ, a live 3D embed for your storefront, and AR view-in-room. Book a demo call to start — if it doesn't impress you, you've lost nothing but a few photos.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="py-12 sm:py-16 lg:py-20 scroll-mt-16"
      style={{ background: "var(--canvas-soft)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-start">
          <Reveal className="lg:sticky lg:top-24">
            <p className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-3">
              Objections, answered
            </p>
            <h2
              id="faq-heading"
              className="font-display font-bold text-[var(--text-primary)]"
              style={{
                fontSize: "clamp(1.875rem, 4vw, 2.5rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                textWrap: "balance",
              }}
            >
              Everything you&apos;re wondering before the call.
            </h2>
            <p className="font-sans text-[14px] sm:text-[15px] leading-[1.6] text-[var(--text-secondary)] mt-3" style={{ textWrap: "pretty" }}>
              Still unsure? Bring the question to your demo call — first model free either way.
            </p>
          </Reveal>

          <div className="flex flex-col gap-3">
            {ITEMS.map((item, i) => {
              const isOpen = open === i;
              return (
                <Reveal key={item.q} delay={Math.min(i * 0.06, 0.3)} y={20}>
                <div
                  className="rounded-[16px] overflow-hidden"
                  style={{
                    background: "var(--canvas)",
                    border: isOpen ? "1px solid var(--border-ink)" : "1px solid rgba(14,15,12,0.10)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-6 py-4 sm:py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
                  >
                    <span className="font-sans font-semibold text-[15px] sm:text-[16px] text-[var(--text-primary)]">
                      {item.q}
                    </span>
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300"
                      style={{
                        background: isOpen ? "var(--ink)" : "var(--canvas-soft)",
                        color: isOpen ? "var(--on-ink)" : "var(--text-muted)",
                        transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                      }}
                      aria-hidden="true"
                    >
                      <Plus className="w-4 h-4" />
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p
                        className="font-sans text-[14px] leading-[1.6] text-[var(--text-secondary)] px-5 sm:px-6 pb-5"
                        style={{ textWrap: "pretty" }}
                      >
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
