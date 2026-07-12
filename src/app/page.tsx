import React from 'react';
import Hero from "@/components/Hero";
import BentoFeatures from "@/components/BentoFeatures";
import LandingPageClient from "@/components/LandingPageClient";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A] selection:bg-[#EFEDEA] flex flex-col font-sans antialiased">

      <Hero />

      <LandingPageClient />

      <BentoFeatures />

      {/* Dashboard Editorial Footer */}
      <footer className="bg-[#F9F8F6] border-t border-[#E5E2DD] py-12 text-[10px] text-[#7A7670] font-mono tracking-widest uppercase">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full border border-[#1A1A1A] flex items-center justify-center font-bold text-[#1A1A1A] text-xs" aria-hidden="true">V</div>
            <span className="font-serif italic lowercase tracking-normal text-sm text-[#1A1A1A]">STUDIO.V / FurniStyle</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
            <span className="hover:text-[#1A1A1A] cursor-help transition-colors">W3C WebXR Compliance</span>
            <span aria-hidden="true">•</span>
            <span className="hover:text-[#1A1A1A] cursor-help transition-colors">CORS Assets Approved</span>
            <span aria-hidden="true">•</span>
            <span className="hover:text-[#1A1A1A] cursor-help transition-colors">Model-Viewer 4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
