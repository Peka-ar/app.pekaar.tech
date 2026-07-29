import React from 'react';
import { Sparkles, Box, Zap, Smartphone, Move3d, Maximize2 } from 'lucide-react';
import { ScrollToSandboxButton, ARDemoButton } from '@/components/HeroCTA';

const PRODUCT_FEATURES = [
  {
    icon: Move3d,
    title: '1:1 Stereoscopic Scale',
    description: 'True-to-life proportions in your customer\'s space.'
  },
  {
    icon: Smartphone,
    title: 'AR in 5 Seconds',
    description: 'iOS Quick Look & Android WebXR, no app required.'
  },
  {
    icon: Maximize2,
    title: 'Zero-Friction Embed',
    description: 'Drop one line. Load anywhere. No plugins.'
  }
];

export default function Hero() {
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden mesh-bg" style={{ borderBottom: '1px solid var(--border-default)' }}>
      <div className="absolute inset-0 pointer-events-none -z-10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-1)]/40 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center text-left">
          <div className="max-w-xl mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-canvas-secondary)] border border-[var(--color-border-default)] text-[10px] font-mono tracking-widest uppercase text-[var(--color-text-muted)] mb-8">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-1)]" aria-hidden="true" />
              <span>The Future of D2C Commerce</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-light text-[var(--color-text-primary)] font-serif tracking-tight mb-6 text-balance leading-[1.05]">
              Elevate Your E-Commerce with <span className="italic font-normal gradient-text">Stereoscopic AR</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-[var(--color-text-secondary)] font-sans leading-[1.55] mb-10 text-balance">
              Boost conversions and reduce returns. STUDIO.V provides zero-friction 3D visualization and augmented reality perfectly calibrated for premium brands.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ScrollToSandboxButton />
              <ARDemoButton />
            </div>

            {/* Subtle metrics row */}
            <div className="mt-12 pt-8 border-t border-[var(--color-border-default)] grid grid-cols-3 gap-6">
              {[
                { label: 'Conversion Lift', value: '+40%' },
                { label: 'Return Rate', value: '-25%' },
                { label: 'Integration Time', value: '<5 Min' }
              ].map((metric, i) => (
                <div key={i} className="flex flex-col items-start gap-1">
                  <span className="text-2xl font-serif italic text-[var(--color-text-primary)]">{metric.value}</span>
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Split Product Demo */}
          <div className="w-full h-full lg:min-h-[500px]">
            <div className="relative w-full h-full rounded-[20px] overflow-hidden border border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-xl">

              {/* Top: Product Visual Area */}
              <div className="relative h-[55%] min-h-[280px] mesh-bg overflow-hidden">
                {/* Decorative gradient orbs */}
                <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[var(--accent-1)]/15 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-[var(--accent-2)]/15 blur-3xl pointer-events-none" />

                {/* Floating status badges */}
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border-default)] text-[9px] font-mono uppercase tracking-widest text-[var(--color-text-secondary)] z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>
                  <span>Live Preview</span>
                </div>

                <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-canvas-inverted)] text-[var(--color-canvas)] text-[9px] font-mono uppercase tracking-widest z-10">
                  <Box className="w-3 h-3" aria-hidden="true" />
                  <span>3D · AR Ready</span>
                </div>

                {/* Centered 3D box illustration */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  <div className="relative">
                    {/* Outer ring */}
                    <div className="absolute inset-0 -m-8 sm:-m-12 rounded-full border border-[var(--color-border-default)] opacity-40 animate-[spin_20s_linear_infinite]" />
                    {/* Middle ring */}
                    <div className="absolute inset-0 -m-4 sm:-m-6 rounded-full border border-dashed border-[var(--color-border-default)] opacity-50" />
                    {/* Central 3D cube */}
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br from-[var(--accent-1)] via-[var(--accent-2)] to-[var(--accent-3)] shadow-2xl flex items-center justify-center transform hover:rotate-12 hover:scale-105 transition-transform duration-500">
                      <Box className="w-14 h-14 sm:w-16 sm:h-16 text-white drop-shadow-lg" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    {/* Floating particles */}
                    <div className="absolute -top-3 -right-3 w-3 h-3 rounded-full bg-[var(--accent-1)] animate-pulse" />
                    <div className="absolute -bottom-4 -left-4 w-2 h-2 rounded-full bg-[var(--accent-2)] animate-pulse" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute top-1/2 -right-6 w-2.5 h-2.5 rounded-full bg-[var(--accent-3)] animate-pulse" style={{ animationDelay: '1s' }} />
                  </div>
                </div>

                {/* Bottom product info bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Now Viewing</p>
                    <p className="text-sm font-serif italic text-[var(--color-text-primary)]">Sheen Armchair · Walnut</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Scale</p>
                    <p className="text-sm font-mono text-[var(--color-text-primary)]">1:1</p>
                  </div>
                </div>
              </div>

              {/* Bottom: Feature highlights */}
              <div className="relative h-[45%] bg-[var(--color-canvas-secondary)] p-5 sm:p-6 space-y-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3.5 h-3.5 text-[var(--accent-1)]" aria-hidden="true" />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-[var(--color-text-primary)]">Why It Works</span>
                </div>
                {PRODUCT_FEATURES.map((feature, i) => {
                  const Icon = feature.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 group">
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-default)] flex items-center justify-center group-hover:border-[var(--accent-1)] transition-colors duration-300">
                        <Icon className="w-4 h-4 text-[var(--color-text-secondary)] group-hover:text-[var(--accent-1)] transition-colors duration-300" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[var(--color-text-primary)] leading-tight">{feature.title}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-snug mt-0.5">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
