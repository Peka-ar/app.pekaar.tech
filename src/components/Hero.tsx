import React from 'react';
import { Sparkles } from '@/components/icons';
import { ScrollToSandboxButton, ARDemoButton } from '@/components/HeroCTA';

export default function Hero() {
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden border-b border-[#E5E2DD]">
      <div className="absolute inset-0 bg-[#F9F8F6] pointer-events-none -z-10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E5E2DD] to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFEDEA] border border-[#E5E2DD] text-[10px] font-mono tracking-widest uppercase text-[#7A7670] mb-8">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
          <span>The Future of D2C Commerce</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-light text-[#1A1A1A] font-serif tracking-tight mb-6" style={{ textWrap: 'balance' }}>
          Elevate Your E-Commerce with <span className="italic font-normal">Stereoscopic AR</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-[#4A4742] font-serif leading-relaxed mb-10" style={{ textWrap: 'balance' }}>
          Boost conversions and reduce returns. STUDIO.V provides zero-friction 3D visualization and augmented reality perfectly calibrated for premium brands.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <ScrollToSandboxButton />
          <ARDemoButton />
        </div>
        
        {/* Subtle metrics row */}
        <div className="mt-16 pt-8 border-t border-[#E5E2DD]/50 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { label: 'Conversion Lift', value: '+40%' },
            { label: 'Return Rate', value: '-25%' },
            { label: 'Integration Time', value: '<5 Min' },
            { label: 'AR Readiness', value: '100%' }
          ].map((metric, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-2xl sm:text-3xl font-serif italic text-[#1A1A1A]">{metric.value}</span>
              <span className="text-[9px] font-sans uppercase tracking-[0.2em] text-[#7A7670]">{metric.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
