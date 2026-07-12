"use client";
import React from 'react';
import { ArrowRight, Smartphone } from 'lucide-react';

export function ScrollToSandboxButton() {
  return (
    <button
      onClick={() => document.getElementById('sandbox-anchor')?.scrollIntoView({ behavior: 'smooth' })}
      className="w-full sm:w-auto px-8 py-4 bg-[#1A1A1A] hover:bg-[#2A2825] text-white rounded-full text-xs font-sans font-semibold uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-transform duration-300 active:scale-95 shadow-lg shadow-black/10"
    >
      Generate Embed Code <ArrowRight className="w-4 h-4" />
    </button>
  );
}

export function ARDemoButton() {
  return (
    <button
      className="w-full sm:w-auto px-8 py-4 bg-white border border-[#E5E2DD] hover:border-[#1A1A1A] hover:bg-[#F9F8F6] text-[#1A1A1A] rounded-full text-xs font-sans font-semibold uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-colors duration-300"
    >
      <Smartphone className="w-4 h-4" /> View AR Demo
    </button>
  );
}
