import React from 'react';

const TRUST_LOGOS = ['Maison', 'Nordik', 'Lumière', 'Atelier', 'Verve', 'Cobalt', 'Hazel', 'Monoforge'];

const STATS = [
  { value: '+40%', label: 'Conversion Lift' },
  { value: '-25%', label: 'Return Rate' },
  { value: '<5 Min', label: 'Integration Time' },
  { value: '12k+', label: 'Brands Live' },
];

export function TrustMarquee() {
  return (
    <section className="relative py-10 overflow-hidden border-b border-[var(--border-default)]" aria-label="Trusted by leading brands">
      <p className="text-center text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--text-muted)] mb-6">
        Trusted by premium D2C brands
      </p>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-12 items-center">
          {[...TRUST_LOGOS, ...TRUST_LOGOS].map((name, i) => (
            <span
              key={i}
              className="text-lg sm:text-xl font-serif italic text-[var(--text-muted)]/70 whitespace-nowrap select-none"
              aria-hidden={i >= TRUST_LOGOS.length}
            >
              {name}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--canvas)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--canvas)] to-transparent" />
      </div>
    </section>
  );
}

export function StatsRibbon() {
  return (
    <section className="py-12 sm:py-16" aria-label="Key metrics">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] bg-[#c44320] p-8 sm:p-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-white relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(24rem 24rem at 80% 120%, #fff, transparent 60%)' }} />
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 relative">
              <span className="text-3xl sm:text-4xl font-serif italic">{s.value}</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GradientCTA() {
  return (
    <section className="py-12 sm:py-16" aria-label="Showroom features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mesh-bg rounded-[28px] border border-[var(--border-default)] p-12 sm:p-20 relative overflow-hidden">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-5xl font-serif font-light text-[var(--text-primary)] text-balance relative">
              Your showroom, <span className="italic gradient-text">reimagined in 3D</span>
            </h2>
            <p className="text-[var(--text-secondary)] font-sans max-w-xl text-sm sm:text-base leading-relaxed mt-4 relative">
              Embed interactive, AR-ready product experiences anywhere in minutes. No plugins, no heavy lifts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            <div className="bg-[var(--color-surface)] rounded-2xl p-5 sm:p-6 border border-[var(--border-default)] hover:border-[var(--accent-1)]/50 transition-all duration-300 hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-1)]/10 flex items-center justify-center mb-4">
                <span className="text-[var(--accent-1)] font-serif italic text-lg">01</span>
              </div>
              <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">Drop-In Embed</h3>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                One line of HTML. Compatible with Shopify, BigCommerce, and headless stacks.
              </p>
            </div>

            <div className="bg-[var(--color-surface)] rounded-2xl p-5 sm:p-6 border border-[var(--border-default)] hover:border-[var(--accent-2)]/50 transition-all duration-300 hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-2)]/10 flex items-center justify-center mb-4">
                <span className="text-[var(--accent-2)] font-serif italic text-lg">02</span>
              </div>
              <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">Global Edge Cache</h3>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                Sub-200ms loads across 84 countries. Models stream progressively.
              </p>
            </div>

            <div className="bg-[var(--color-surface)] rounded-2xl p-5 sm:p-6 border border-[var(--border-default)] hover:border-[var(--accent-3)]/50 transition-all duration-300 hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-3)]/10 flex items-center justify-center mb-4">
                <span className="text-[var(--accent-3)] font-serif italic text-lg">03</span>
              </div>
              <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">Native AR Fallback</h3>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                Detects iOS Quick Look and Android WebXR automatically. No app install.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
