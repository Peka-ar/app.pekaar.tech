"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { Product } from "@/lib/types";
import { Ruler, ShieldCheck } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
}

export default function ProductCatalog({
  products,
  selectedProductId,
  onSelectProduct
}: ProductCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const categories = ['All', 'Chairs', 'Sofas', 'Stools', 'Lighting'];

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="space-y-6">
      
      {/* Category selector panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-default)]">
        <div>
          <span className="text-[9px] sm:text-[10px] uppercase font-sans tracking-[0.25em] text-[var(--text-muted)] font-bold">Showroom Collections</span>
          <h2 className="text-xl sm:text-2xl font-light font-serif italic text-[var(--text-primary)] mt-1 tracking-tight">Furniture Catalog</h2>
        </div>
        
        {/* Category Pill Filters */}
        <div className="flex flex-row overflow-x-auto whitespace-nowrap pb-1.5 gap-1.5 sm:flex-wrap sm:pb-0 scrollbar-none max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
              className={`text-[9.5px] font-sans uppercase tracking-[0.15em] font-bold py-2 px-4 rounded-full transition-colors border shrink-0 ${activeCategory === cat ? 'bg-[var(--text-primary)] text-white border-[var(--text-primary)] shadow-sm' : 'bg-[var(--surface)] border-[var(--border-default)] hover:bg-[var(--canvas-secondary)] text-[var(--text-muted)]'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {filteredProducts.map((p) => {
          const isSelected = p.id === selectedProductId;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => onSelectProduct(p.id)}
              className={`group cursor-pointer rounded-2xl overflow-hidden border bg-[var(--surface)] transition-all duration-300 flex flex-col w-full text-left ${isSelected ? 'ring-2 ring-[var(--accent-1)] border-transparent scale-[0.99]' : 'border-[var(--border-default)] hover:border-[var(--accent-1)] hover:-translate-y-[1px] hover:shadow-md'}`}
              id={`catalog-product-${p.id}`}
            >
              <div className="aspect-[4/3] bg-[var(--canvas-secondary)] relative overflow-hidden">
                {/* Product Picture */}
                <Image
                  src={p.thumbnail}
                  alt={p.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                  loading="lazy"
                  decoding="async"
                />

                {/* Subcategory Label overlay */}
                <span className="absolute top-3 left-3 bg-[var(--surface)]/95 text-[var(--text-muted)] backdrop-blur-sm shadow-sm text-[8px] font-sans tracking-[0.15em] uppercase font-medium px-2 py-1 rounded-sm border border-[var(--border-default)]/50">
                  {p.category}
                </span>

                {/* AR Ready Indicator */}
                <span className="absolute top-3 right-3 bg-[var(--text-primary)]/90 text-[var(--on-primary)] border border-white/10 text-[8px] font-sans tracking-[0.12em] font-medium px-2 py-1 rounded-sm shadow-sm flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>AR READY</span>
                </span>
                
                {/* Active Indicator bar */}
                {isSelected && (
                  <div className="absolute inset-0 bg-[var(--text-primary)]/10 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="bg-[var(--accent-1)] text-white font-sans text-[8px] font-medium tracking-[0.2em] py-1.5 px-4 rounded-sm shadow-md">
                      STUDIO ACTIVE
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info description */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] uppercase font-sans text-[var(--text-muted)] font-semibold tracking-[0.2em]">{p.brand}</span>
                    <span className="text-xs font-serif italic text-[var(--text-primary)]">${p.price}</span>
                  </div>
                  <h3 className="text-sm font-serif italic font-light text-[var(--text-primary)] mt-1.5 line-clamp-1 group-hover:text-[var(--accent-1)] transition-colors">{p.name}</h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed font-serif italic">{p.description}</p>
                </div>
                
                <div className="mt-4 pt-3 border-t border-[var(--border-default)]/50 flex items-center justify-between text-[10px] font-sans text-[var(--text-muted)]">
                  <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider">
                    <Ruler className="w-3.5 h-3.5 text-[var(--text-muted)]/40" />
                    <span>{p.idealPhysicalDimensions.width}W × {p.idealPhysicalDimensions.height}H CM</span>
                  </span>
                  
                  <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--accent-1)] group-hover:translate-x-1 transition-colors">
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
