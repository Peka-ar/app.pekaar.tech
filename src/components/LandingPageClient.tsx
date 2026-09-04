"use client";
import React, { useState } from "react";
import { HelpCircle, Info, Sliders } from "lucide-react";
import dynamic from "next/dynamic";
import { PRODUCTS } from "@/lib/types";
import ProductCatalog from "@/components/ProductCatalog";

const ThreeDConfigurator = dynamic(() => import("@/components/ThreeDConfigurator"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full min-h-[400px] flex items-center justify-center rounded-[24px]"
      style={{ backgroundColor: "var(--canvas-soft)", border: "1px solid var(--border-default)" }}
    >
      <div className="animate-pulse flex flex-col items-center">
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--text-primary)", borderTopColor: "transparent" }}
        />
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Loading 3D Engine…
        </p>
      </div>
    </div>
  ),
});

export default function LandingPageClient() {
  const [selectedProductId, setSelectedProductId] = useState<string>("sheen-armchair");
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const activeProduct = PRODUCTS.find((p) => p.id === selectedProductId) || PRODUCTS[0];

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Help disclosure — compact, honest */}
      {helpOpen && (
        <div
          className="p-5 sm:p-7 rounded-[24px] flex flex-col md:flex-row gap-4 sm:gap-6 items-start relative"
          style={{ background: "var(--surface)", border: "1px solid var(--border-default)" }}
        >
          <button
            onClick={() => setHelpOpen(false)}
            aria-label="Close guide"
            className="absolute top-4 right-4 text-[11px] uppercase tracking-widest font-semibold rounded-full px-3 py-1.5 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
            style={{ background: "var(--surface)", color: "var(--text-primary)", borderColor: "var(--border-default)" }}
          >
            ✕ Close
          </button>
          <Info className="w-5 h-5 text-[var(--text-muted)] shrink-0 mt-0.5 hidden md:block" aria-hidden="true" />
          <div className="space-y-3 w-full">
            <h3 className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-[var(--text-primary)]">
              About this demo
            </h3>
            <p className="font-sans text-[14px] leading-[1.6] text-[var(--text-secondary)]">
              This sandbox uses a bundled demo model to show the viewer and embed — no account or upload required. Real
              projects start from your photos; an artist refines every model before it goes live.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-[16px] p-4" style={{ background: "var(--canvas-soft)", border: "1px solid var(--border-default)" }}>
                <h4 className="font-mono text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" /> Native AR
                </h4>
                <p className="font-sans text-[13px] leading-[1.5] text-[var(--text-secondary)] mt-2">
                  iOS Quick Look and Android WebXR — view at true 1:1 scale, no app.
                </p>
              </div>
              <div className="rounded-[16px] p-4" style={{ background: "var(--canvas-soft)", border: "1px solid var(--border-default)" }}>
                <h4 className="font-mono text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" /> Materials
                </h4>
                <p className="font-sans text-[13px] leading-[1.5] text-[var(--text-secondary)] mt-2">
                  PBR materials rendered in the viewer — rotate, inspect, and place in your space.
                </p>
              </div>
              <div className="rounded-[16px] p-4" style={{ background: "var(--canvas-soft)", border: "1px solid var(--border-default)" }}>
                <h4 className="font-mono text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" /> One-line embed
                </h4>
                <p className="font-sans text-[13px] leading-[1.5] text-[var(--text-secondary)] mt-2">
                  Copy one iframe line — works on Shopify, WooCommerce, Webflow, and custom stacks.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sandbox — viewer */}
      <section className="space-y-5" id="sandbox-anchor">
        <div
          className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-4 pb-4"
          style={{ borderBottom: "1px solid var(--border-default)" }}
        >
          <div>
            <p className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-[var(--text-muted)]">
              Interactive sandbox
            </p>
            <h2
              className="font-display font-bold text-[var(--text-primary)] mt-1"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", lineHeight: 1.1, letterSpacing: "-0.02em", textWrap: "balance" }}
            >
              Build your e-commerce embed
            </h2>
            <p className="font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)] mt-1">
              Demo model — labeled. Real projects are artist-finished in hours.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setHelpOpen(!helpOpen)}
              aria-expanded={helpOpen}
              aria-label="Toggle guide"
              className="px-3.5 py-2 rounded-full text-[12px] font-semibold uppercase tracking-[0.08em] flex items-center gap-1.5 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
              style={{
                background: "var(--surface)",
                color: "var(--text-muted)",
                borderColor: "var(--border-default)",
              }}
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Guide
            </button>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-mono uppercase tracking-[0.08em] font-medium border"
              style={{ background: "var(--positive-pale)", color: "var(--positive-copy)", borderColor: "transparent" }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--positive)" }} aria-hidden="true" />
              Live environment
            </span>
          </div>
        </div>

        <ThreeDConfigurator product={activeProduct} />
      </section>

      {/* Catalog */}
      <section id="showroom-catalog-panel" className="pt-4" style={{ borderTop: "1px solid var(--border-default)" }}>
        <div className="mb-6">
          <p className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-[var(--text-muted)]">Demo catalog</p>
          <h2
            className="font-display font-bold text-[var(--text-primary)] mt-1"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", lineHeight: 1.15, letterSpacing: "-0.015em" }}
          >
            Select a product template
          </h2>
          <p className="font-sans text-[13px] text-[var(--text-muted)] mt-1">Demo content — labeled.</p>
        </div>
        <ProductCatalog products={PRODUCTS} selectedProductId={selectedProductId} onSelectProduct={setSelectedProductId} />
      </section>
    </main>
  );
}
