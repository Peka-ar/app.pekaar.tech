"use client";

import React, { useEffect, useRef } from "react";

const WORDS = [
  "AI",
  "drafts",
  "in",
  "minutes.",
  "Artists",
  "finish",
  "by",
  "hand.",
  "Shoppers",
  "see",
  "it",
  "in",
  "their",
  "room.",
] as const;

// Mandatory tagline-reveal moment: words fade from muted to full ink
// one at a time via IntersectionObserver (never a scroll listener).
export default function TaglineReveal() {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const els = refs.current.filter((el): el is HTMLSpanElement => el !== null);
    if (els.length === 0) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-revealed"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLSpanElement).classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.9 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      aria-label="Why Peka AR is different"
      className="py-14 sm:py-20"
      style={{ background: "var(--surface-peach)" }}
    >
      <style>{`
        .tagline-word {
          opacity: 0.28;
          transition: opacity 700ms cubic-bezier(0.32, 0.72, 0, 1);
        }
        .tagline-word.is-revealed {
          opacity: 1;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p
          className="font-display font-bold text-[var(--text-primary)] max-w-[680px]"
          style={{
            fontSize: "clamp(1.875rem, 5vw, 3.75rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            textWrap: "balance",
          }}
        >
          {WORDS.map((word, i) => (
            <span
              key={`${word}-${i}`}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="tagline-word"
            >
              {word}{" "}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
