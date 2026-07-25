import React from 'react';
import Hero from "@/components/Hero";
import BentoFeatures from "@/components/BentoFeatures";
import LandingPageClient from "@/components/LandingPageClient";
import { TrustMarquee, StatsRibbon, GradientCTA } from "@/components/LandingExtras";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans antialiased" style={{ backgroundColor: 'var(--canvas)', color: 'var(--text-primary)', userSelect: 'auto' }}>

      <Hero />

      <TrustMarquee />

      <LandingPageClient />

      <StatsRibbon />

      <BentoFeatures />

      <GradientCTA />

      {/* Dashboard Editorial Footer */}
      <footer className="border-t py-12 text-[10px] font-mono tracking-widest uppercase" style={{ backgroundColor: 'var(--canvas)', borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ border: '1px solid var(--text-primary)', color: 'var(--text-primary)' }} aria-hidden="true">V</div>
            <span className="font-serif italic lowercase tracking-normal text-sm" style={{ color: 'var(--text-primary)' }}>STUDIO.V / FurniStyle</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
            <span className="transition-colors hover:opacity-100 opacity-70" title="W3C WebXR Compliance">W3C WebXR Compliance</span>
            <span aria-hidden="true">&bull;</span>
            <span className="transition-colors hover:opacity-100 opacity-70" title="CORS Assets Approved">CORS Assets Approved</span>
            <span aria-hidden="true">&bull;</span>
            <span className="transition-colors hover:opacity-100 opacity-70" title="Model-Viewer 4.0">Model-Viewer 4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
