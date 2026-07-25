"use client";
import React, { useState } from 'react';
import { HelpCircle, Info, Sliders } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PRODUCTS } from "@/lib/types";
import ProductCatalog from "@/components/ProductCatalog";

const ThreeDConfigurator = dynamic(() => import('@/components/ThreeDConfigurator'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center rounded-3xl" style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--border-default)' }}>
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent' }}></div>
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading 3D Engine&hellip;</p>
      </div>
    </div>
  )
});

export default function LandingPageClient() {
  const [selectedProductId, setSelectedProductId] = useState<string>('sheen-armchair');
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const activeProduct = PRODUCTS.find(p => p.id === selectedProductId) || PRODUCTS[0];

  return (
    <>

      {/* Main Studio Arena Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
        
        {/* Studio Help Documentation popup */}
        {helpOpen && (
          <div className="p-5 sm:p-8 bg-[var(--color-canvas-secondary)] border border-[var(--color-border-default)] rounded-2xl sm:rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 sm:gap-6 items-start transition-opacity duration-300 relative">
            <button 
              onClick={() => setHelpOpen(false)} 
              aria-label="Close manual"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-[var(--color-text-primary)] bg-[var(--color-surface)] border border-[var(--color-border-default)] px-2.5 py-1.5 rounded-full hover:bg-[var(--color-canvas-inverted)] hover:text-[var(--color-on-primary)] transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
            >
              ✕ Close
            </button>
            <Info className="w-5 h-5 text-[var(--color-text-muted)] shrink-0 mt-0.5 hidden md:block" aria-hidden="true" />
            <div className="space-y-4 w-full">
              <h3 className="text-xs uppercase tracking-[0.25em] font-serif font-bold text-[var(--color-text-primary)]">STUDIO.V Manual & Spatial Integration Guide</h3>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed font-serif italic">
                A professional interactive dialogue between client sites and 3D rendering canvases. Redefining e-commerce through real-time materials modeling and stereoscopic Augmented Reality bounds.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
                <div className="bg-[var(--color-canvas)] p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--color-border-default)]">
                  <h4 className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[var(--color-text-muted)]" aria-hidden="true" /> 1. Native AR System
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-2 font-serif leading-relaxed">
                    Stereoscopic model visualization at true physical 1:1 scale. Connects to iOS Quick-Look and Android WebXR natively.
                  </p>
                </div>
                <div className="bg-[var(--color-canvas)] p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--color-border-default)]">
                  <h4 className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[var(--color-text-muted)]" aria-hidden="true" /> 2. Tactileness customizer
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-2 font-serif leading-relaxed">
                    Dynamically queries raw PBR materials in glTF/glb binary coordinates upon load for exact texture manipulation.
                  </p>
                </div>
                <div className="bg-[var(--color-canvas)] p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--color-border-default)] sm:col-span-2 md:col-span-1">
                  <h4 className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[var(--color-text-muted)]" aria-hidden="true" /> 3. Live Embed system
                  </h4>
                  <p className="text-[var(--color-text-secondary)] mt-2 font-serif leading-relaxed text-[11px]">
                    Configure desired product finishes, dimensions limits, and aesthetic themes. Embed the responsive code directly into shop templates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: The Core 3D Interactive Configurator Component */}
        <section className="space-y-6" id="sandbox-anchor">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end border-b border-[var(--color-border-default)] pb-4 gap-4">
            <div>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-muted)] font-bold">Interactive Sandbox</span>
              <h2 className="text-3xl sm:text-4xl font-light text-[var(--color-text-primary)] font-serif italic mt-1" style={{ textWrap: 'balance' }}>Build Your E-Commerce Embed</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setHelpOpen(!helpOpen)}
                aria-expanded={helpOpen}
                aria-label="Toggle Manual"
                className="px-3 py-1.5 border border-[var(--color-border-default)] rounded-full text-[10px] uppercase tracking-widest font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)] flex items-center gap-1.5 transition-colors duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
              >
                <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Manual</span>
              </button>
              <div className="text-[8px] sm:text-[9px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] flex items-center gap-1.5 sm:gap-2 bg-[var(--color-canvas-secondary)] px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-[var(--color-border-default)] shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>
                <span className="hidden sm:inline">LIVE</span><span>ENVIRONMENT</span>
              </div>
            </div>
          </div>
          
          <ThreeDConfigurator product={activeProduct} />
        </section>

        {/* Section 2: Showroom Catalog Filter Selection Grid */}
        <section id="showroom-catalog-panel" className="pt-8 border-t border-[var(--color-border-default)]">
          <div className="mb-6">
             <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-muted)] font-bold">Demo Catalog</span>
             <h2 className="text-2xl sm:text-3xl font-light text-[var(--color-text-primary)] font-serif italic mt-1">Select a Product Template</h2>
          </div>
          <ProductCatalog 
            products={PRODUCTS}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
          />
        </section>

        {/* Coral Showcase Band - solid background for consistent white-text contrast */}
        <section className="bg-[#c44320] text-white rounded-[24px] p-8 sm:p-12 lg:p-16 mt-24 relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(30rem 30rem at 20% 0%, #fff, transparent 60%)' }} />

          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-1 flex flex-col justify-center">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/90 font-bold mb-3">From The Field</span>
              <h2 className="text-3xl sm:text-4xl font-serif font-light mb-4 leading-tight">
                Built for premium D2C brands
              </h2>
              <p className="text-white font-sans text-sm sm:text-base leading-relaxed">
                Studio V powers stereoscopic product experiences for furniture, jewelry, and apparel leaders shipping to 84+ countries.
              </p>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-mono font-bold text-white">M</div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/90 font-semibold">Maison</span>
                </div>
                <p className="text-[13px] leading-relaxed mb-3 text-white">
                  &ldquo;AR previews reduced our return rate by 31% in the first quarter. Customers buy with confidence.&rdquo;
                </p>
                <span className="text-[9px] font-mono uppercase tracking-widest text-white/80">Furniture · D2C</span>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-mono font-bold text-white">L</div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/90 font-semibold">Lumière</span>
                </div>
                <p className="text-[13px] leading-relaxed mb-3 text-white">
                  &ldquo;The embed took 4 minutes. Our checkout conversion jumped 42% on mobile.&rdquo;
                </p>
                <span className="text-[9px] font-mono uppercase tracking-widest text-white/80">Jewelry · Mobile-first</span>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-mono font-bold text-white">N</div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/90 font-semibold">Nordik</span>
                </div>
                <p className="text-[13px] leading-relaxed mb-3 text-white">
                  &ldquo;Stereoscopic scale finally matches the catalog. No more sizing disputes.&rdquo;
                </p>
                <span className="text-[9px] font-mono uppercase tracking-widest text-white/80">Apparel · 12 Markets</span>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-mono font-bold text-white">A</div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/90 font-semibold">Atelier</span>
                </div>
                <p className="text-[13px] leading-relaxed mb-3 text-white">
                  &ldquo;From photo to interactive 3D in under 90 seconds. The pipeline just works.&rdquo;
                </p>
                <span className="text-[9px] font-mono uppercase tracking-widest text-white/80">Decor · Enterprise</span>
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
