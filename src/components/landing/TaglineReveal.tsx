"use client";

import React, { useEffect, useRef } from "react";

const SENTENCES: readonly (readonly string[])[] = [
  ["AI", "drafts", "in", "minutes."],
  ["Artists", "finish", "by", "hand."],
  ["Shoppers", "see", "it", "in", "their", "room."],
];

// The pull-quote moment: the tagline in the quote serif (Instrument Serif
// italic) as ONE centered line on desktop (nowrap at lg+), wrapping to two
// lines on mobile — reads like a quotation, is not one, so no quotation
// marks. Words still reveal one at a time via IntersectionObserver (never a
// scroll listener). The middle sentence keeps the primary (forest) accent.
// Resting opacity is 0.55 with a 1.5rem (24px) minimum size so the muted
// state stays ≥3:1 (WCAG large-text AA) — including the forest-accent words.
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

  let wordIndex = 0;

  return (
    <section
      aria-label="Why Peka AR is different"
      className="py-16 sm:py-24"
      style={{ background: "var(--canvas)" }}
    >
      <style>{`
        .tagline-single {
          font-size: clamp(1.5rem, 2.6vw, 2rem);
          line-height: 1.35;
          letter-spacing: -0.01em;
          overflow-wrap: break-word;
        }
        @media (min-width: 1024px) {
          .tagline-single {
            white-space: nowrap;
          }
        }
        .tagline-word {
          opacity: 0.55;
          transition: opacity 700ms cubic-bezier(0.32, 0.72, 0, 1);
          margin-right: 0.26em;
        }
        .tagline-word:last-child {
          margin-right: 0;
        }
        .tagline-word.is-revealed {
          opacity: 1;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p
          className="tagline-single font-quote italic text-center"
          style={{ color: "var(--text-primary)" }}
        >
          {SENTENCES.map((words, sentence) =>
            words.map((word) => {
              const i = wordIndex++;
              return (
                <span
                  key={`${sentence}-${word}`}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  className="tagline-word"
                  style={
                    sentence === 1 ? { color: "var(--primary)" } : undefined
                  }
                >
                  {word}
                </span>
              );
            })
          )}
        </p>
      </div>
    </section>
  );
}
