"use client";
import React, { useState } from 'react';
import { Box, HelpCircle, Info, Sliders } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PRODUCTS } from "@/lib/types";
import ProductCatalog from "@/components/ProductCatalog";

const ThreeDConfigurator = dynamic(() => import('@/components/ThreeDConfigurator'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#F9F8F6] border border-[#E5E2DD] rounded-3xl">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-[#1A1A1A] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-mono text-[#7A7670] uppercase tracking-widest">Loading 3D Engine...</p>
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
      {/* Editorial Corporate Header Bar */}
      <header className="bg-[#F9F8F6]/90 border-b border-[#E5E2DD] sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#1A1A1A] flex items-center justify-center bg-transparent shrink-0">
              <Box className="w-4 h-4 sm:w-5 sm:h-5 text-[#1A1A1A]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[15px] sm:text-lg font-light tracking-[0.25em] uppercase font-serif text-[#1A1A1A] shrink-0">STUDIO.V</span>
                <span className="bg-[#EFEDEA] text-[#4A4742] text-[7px] sm:text-[8px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border border-[#E5E2DD] shrink-0">3D PRO</span>
              </div>
              <h1 className="text-[9px] sm:text-[11px] uppercase tracking-widest text-[#7A7670] mt-0.5 truncate hidden sm:block">Virtual Furniture Configurator & AR Hub</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setHelpOpen(!helpOpen)}
              aria-expanded={helpOpen}
              className="px-3 py-2 sm:px-4 sm:py-2 border border-[#E5E2DD] rounded-full text-[9px] sm:text-[10px] uppercase tracking-widest font-medium text-[#7A7670] hover:text-[#1A1A1A] hover:border-[#1A1A1A] flex items-center gap-1 sm:gap-1.5 transition-colors duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">Manual</span>
            </button>
            <Link
              href="/auth"
              className="px-3 py-2 sm:px-4 sm:py-2 bg-[#1A1A1A] hover:bg-[#2A2825] text-white rounded-full text-[9px] sm:text-[10px] uppercase tracking-widest font-medium flex items-center gap-1 sm:gap-1.5 shadow-sm active:scale-95 transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
            >
              <span className="hidden xs:inline sm:inline">Sign In</span>
            </Link>
          </div>

        </div>
      </header>

      {/* Main Studio Arena Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
        
        {/* Studio Help Documentation popup */}
        {helpOpen && (
          <div className="p-5 sm:p-8 bg-[#EFEDEA] border border-[#E5E2DD] rounded-2xl sm:rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 sm:gap-6 items-start transition-opacity duration-300 relative">
            <button 
              onClick={() => setHelpOpen(false)} 
              aria-label="Close manual"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-[#1A1A1A] bg-white border border-[#E5E2DD] px-2.5 py-1.5 rounded-full hover:bg-[#1A1A1A] hover:text-white transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
            >
              ✕ Close
            </button>
            <Info className="w-5 h-5 text-[#7A7670] shrink-0 mt-0.5 hidden md:block" aria-hidden="true" />
            <div className="space-y-4 w-full">
              <h3 className="text-xs uppercase tracking-[0.25em] font-serif font-bold text-[#1A1A1A]">STUDIO.V Manual & Spatial Integration Guide</h3>
              <p className="text-xs sm:text-sm text-[#4A4742] leading-relaxed font-serif italic">
                A professional interactive dialogue between client sites and 3D rendering canvases. Redefining e-commerce through real-time materials modeling and stereoscopic Augmented Reality bounds.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
                <div className="bg-[#F9F8F6] p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-[#E5E2DD]">
                  <h4 className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#7A7670]" aria-hidden="true" /> 1. Native AR System
                  </h4>
                  <p className="text-[11px] text-[#4A4742] mt-2 font-serif leading-relaxed">
                    Stereoscopic model visualization at true physical 1:1 scale. Connects to iOS Quick-Look and Android WebXR natively.
                  </p>
                </div>
                <div className="bg-[#F9F8F6] p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-[#E5E2DD]">
                  <h4 className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#7A7670]" aria-hidden="true" /> 2. Tactileness customizer
                  </h4>
                  <p className="text-[11px] text-[#4A4742] mt-2 font-serif leading-relaxed">
                    Dynamically queries raw PBR materials in glTF/glb binary coordinates upon load for exact texture manipulation.
                  </p>
                </div>
                <div className="bg-[#F9F8F6] p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-[#E5E2DD] sm:col-span-2 md:col-span-1">
                  <h4 className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#7A7670]" aria-hidden="true" /> 3. Live Embed system
                  </h4>
                  <p className="text-[#4A4742] mt-2 font-serif leading-relaxed text-[11px]">
                    Configure desired product finishes, dimensions limits, and aesthetic themes. Embed the responsive code directly into shop templates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: The Core 3D Interactive Configurator Component */}
        <section className="space-y-6" id="sandbox-anchor">
          <div className="flex justify-between items-end border-b border-[#E5E2DD] pb-4">
            <div>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-[#7A7670] font-bold">Interactive Sandbox</span>
              <h2 className="text-3xl sm:text-4xl font-light text-[#1A1A1A] font-serif italic mt-1" style={{ textWrap: 'balance' }}>Build Your E-Commerce Embed</h2>
            </div>
            <div className="text-[8px] sm:text-[9px] uppercase tracking-widest font-mono text-[#7A7670] flex items-center gap-1.5 sm:gap-2 bg-[#EFEDEA] px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-[#E5E2DD] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
              <span className="hidden xs:inline">LIVE</span><span>ENVIRONMENT</span>
            </div>
          </div>
          
          <ThreeDConfigurator product={activeProduct} />
        </section>

        {/* Section 2: Showroom Catalog Filter Selection Grid */}
        <section id="showroom-catalog-panel" className="pt-8 border-t border-[#E5E2DD]">
          <div className="mb-6">
             <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-[#7A7670] font-bold">Demo Catalog</span>
             <h2 className="text-2xl sm:text-3xl font-light text-[#1A1A1A] font-serif italic mt-1">Select a Product Template</h2>
          </div>
          <ProductCatalog 
            products={PRODUCTS}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
          />
        </section>

      </main>
    </>
  );
}
