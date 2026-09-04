import React from "react";

const STEPS = [
  {
    n: "01",
    eyebrow: "Capture",
    title: "Send product photos",
    body: "Upload standard product photography — no studio rig, no 3D files needed.",
  },
  {
    n: "02",
    eyebrow: "Model",
    title: "AI-accelerated pipeline",
    body: "Our pipeline drafts the model fast — that's where the AI stops.",
  },
  {
    n: "03",
    eyebrow: "Finish",
    title: "Artist-finished by hand",
    body: "A 3D artist refines every model and optimizes it for the web. Never raw AI output.",
  },
  {
    n: "04",
    eyebrow: "Serve",
    title: "One line, live + AR",
    body: "Embed with one iframe line; shoppers preview in their own room on iOS and Android.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="py-12 sm:py-16 lg:py-20"
      style={{ background: "var(--canvas)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-8 sm:mb-10">
          <p className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-[var(--text-muted)] mb-3">
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
        </div>

        <div className="relative">
          {/* connecting line desktop */}
          <div
            className="hidden lg:block absolute left-0 right-0 top-[28px] h-px"
            style={{ background: "var(--border-default)" }}
            aria-hidden="true"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="relative rounded-[24px] p-6 sm:p-7 flex flex-col gap-3"
                style={{ background: "var(--surface)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-medium tracking-[0.08em] text-[var(--accent-copy)]">{s.n}</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--accent)] shrink-0" aria-hidden="true" />
                  <span className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-[var(--text-muted)]">
                    {s.eyebrow}
                  </span>
                </div>
                <h3 className="font-display font-bold text-[18px] sm:text-[20px] leading-[1.2] tracking-[-0.015em] text-[var(--text-primary)]">
                  {s.title}
                </h3>
                <p className="font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
