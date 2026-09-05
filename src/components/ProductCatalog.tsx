"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Product } from "@/lib/types";
import { Ruler, ShieldCheck } from "lucide-react";

interface ProductCatalogProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
}

export default function ProductCatalog({ products, selectedProductId, onSelectProduct }: ProductCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  // Derive pills from products actually present so no pill ever filters to a
  // dead empty grid (single-demo catalog shows All + its category only).
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const filteredProducts = activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid rgba(14,15,12,0.12)" }}>
        <div>
          <p className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)]">Showroom collections</p>
          <h3 className="font-sans font-semibold text-[22px] tracking-[-0.015em] text-[var(--text-primary)] mt-1">Demo showroom</h3>
          <p className="font-sans text-[11px] font-semibold tracking-[0.06em] uppercase text-[var(--text-muted)] mt-0.5">Demo — labeled</p>
        </div>

        <div className="flex flex-row overflow-x-auto whitespace-nowrap pb-1.5 gap-1.5 sm:flex-wrap sm:pb-0 scrollbar-none max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
              className={`font-sans text-[12px] font-semibold tracking-[0.06em] uppercase py-2 px-4 rounded-full transition-colors border shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] ${activeCategory === cat ? "bg-[var(--ink)] text-[var(--on-ink)] border-[var(--ink)]" : "bg-[var(--canvas)] border-transparent hover:border-[var(--ink)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {filteredProducts.length === 0 && (
          <div
            className="col-span-full rounded-[16px] px-5 py-8 text-center"
            style={{ background: "var(--canvas)", border: "1px solid rgba(14,15,12,0.12)" }}
          >
            <p className="font-sans text-[14px] font-semibold text-[var(--text-primary)]">No demo models in this category yet</p>
            <p className="font-sans text-[13px] text-[var(--text-secondary)] mt-1">Switch back to All — real projects cover any product you sell.</p>
          </div>
        )}
        {filteredProducts.map((p) => {
          const isSelected = p.id === selectedProductId;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => onSelectProduct(p.id)}
              id={`catalog-product-${p.id}`}
              className={`group cursor-pointer rounded-[24px] overflow-hidden border bg-[var(--canvas)] transition-all duration-300 flex flex-col w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] ${isSelected ? "ring-2 ring-[var(--accent)] border-transparent" : "border-[var(--border-default)] hover:border-[var(--accent)] hover:shadow-sm"}`}
            >
              <div className="aspect-[4/3] relative overflow-hidden" style={{ background: "var(--canvas-soft)" }}>
                <Image
                  src={p.thumbnail}
                  alt={p.name}
                  fill
                  className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                  loading="lazy"
                  decoding="async"
                />

                <span
                  className="absolute top-3 left-3 backdrop-blur-sm text-[10px] font-sans font-semibold tracking-[0.08em] uppercase px-2 py-1 rounded-full border"
                  style={{ background: "var(--canvas)", color: "var(--text-muted)", borderColor: "var(--border-default)" }}
                >
                  {p.category}
                </span>

                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-sans font-semibold tracking-[0.06em] uppercase px-2 py-1 rounded-full border shadow-sm" style={{ background: "var(--ink)", color: "var(--on-ink)", borderColor: "rgba(232,235,230,.12)" }}>
                  <ShieldCheck className="w-3 h-3" style={{ color: "var(--accent)" }} aria-hidden="true" />
                  AR ready
                </span>

                {/* Demo label */}
                <span
                  className="absolute bottom-3 left-3 text-[10px] font-sans font-semibold uppercase tracking-[0.08em] px-2 py-1 rounded-full"
                  style={{ background: "var(--accent-pale)", color: "var(--positive-deep)" }}
                >
                  Demo
                </span>

                {isSelected && (
                  <span className="absolute inset-0 bg-[var(--ink)]/10 flex items-center justify-center" aria-hidden="true">
                    <span className="bg-[var(--accent)] text-[var(--on-accent)] font-sans text-[10px] font-semibold tracking-[0.12em] uppercase py-1.5 px-4 rounded-full shadow-sm">
                      Selected
                    </span>
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] truncate">{p.brand}</span>
                    <span className="font-sans font-semibold text-[13px] text-[var(--text-primary)] shrink-0">${p.price}</span>
                  </div>
                  <h3 className="font-sans font-semibold text-[15px] leading-[1.25] tracking-[-0.01em] text-[var(--text-primary)] mt-1 line-clamp-1 group-hover:text-[var(--ink-deep)] transition-colors">
                    {p.name}
                  </h3>
                  <p className="font-sans text-[13px] leading-[1.5] text-[var(--text-secondary)] mt-1 line-clamp-2">{p.description}</p>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between text-[11px]" style={{ borderTop: "1px solid var(--border-default)" }}>
                  <span className="flex items-center gap-1 font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    <Ruler className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                    {p.idealPhysicalDimensions.width}W × {p.idealPhysicalDimensions.height}H cm
                  </span>
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] group-hover:text-[var(--ink-deep)] transition-colors">
                    Configure →
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
