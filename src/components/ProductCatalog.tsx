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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2DD]">
        <div>
          <span className="text-[9px] sm:text-[10px] uppercase font-sans tracking-[0.25em] text-[#7A7670] font-bold">Showroom Collections</span>
          <h2 className="text-xl sm:text-2xl font-light font-serif italic text-[#1A1A1A] mt-1 tracking-tight">Furniture Catalog</h2>
        </div>
        
        {/* Category Pill Filters */}
        <div className="flex flex-row overflow-x-auto whitespace-nowrap pb-1.5 gap-1.5 sm:flex-wrap sm:pb-0 scrollbar-none max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[9.5px] font-sans uppercase tracking-[0.15em] font-bold py-2 px-4 rounded-full transition-all border shrink-0 ${activeCategory === cat ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm' : 'bg-white border-[#E5E2DD] hover:bg-[#EFEDEA] text-[#7A7670]'}`}
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
            <div
              key={p.id}
              onClick={() => onSelectProduct(p.id)}
              className={`group cursor-pointer rounded-2xl overflow-hidden border bg-white transition-all duration-300 flex flex-col ${isSelected ? 'ring-1 ring-[#1A1A1A] border-[#1A1A1A] scale-99' : 'border-[#E5E2DD] hover:border-[#1A1A1A] hover:-translate-y-[1px]'}`}
              id={`catalog-product-${p.id}`}
            >
              <div className="aspect-[4/3] bg-[#EFEDEA] relative overflow-hidden">
                {/* Product Picture */}
                <Image
                  src={p.thumbnail}
                  alt={p.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-all duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                  loading="lazy"
                  decoding="async"
                />

                {/* Subcategory Label overlay */}
                <span className="absolute top-3 left-3 bg-[#F9F8F6]/95 text-[#7A7670] backdrop-blur-sm shadow-sm text-[8px] font-sans tracking-[0.15em] uppercase font-medium px-2 py-1 rounded-sm border border-[#E5E2DD]/50">
                  {p.category}
                </span>

                {/* AR Ready Indicator */}
                <span className="absolute top-3 right-3 bg-[#1A1A1A]/90 text-[#F9F8F6] border border-white/10 text-[8px] font-sans tracking-[0.12em] font-medium px-2 py-1 rounded-sm shadow-sm flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>AR READY</span>
                </span>
                
                {/* Active Indicator bar */}
                {isSelected && (
                  <div className="absolute inset-0 bg-[#1A1A1A]/10 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="bg-[#1A1A1A] text-white font-sans text-[8px] font-medium tracking-[0.2em] py-1.5 px-4 rounded-sm shadow-md">
                      STUDIO ACTIVE
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info description */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] uppercase font-sans text-[#7A7670] font-semibold tracking-[0.2em]">{p.brand}</span>
                    <span className="text-xs font-serif italic text-[#1A1A1A]">${p.price}</span>
                  </div>
                  <h3 className="text-sm font-serif italic font-light text-[#1A1A1A] mt-1.5 line-clamp-1 group-hover:text-black transition-colors">{p.name}</h3>
                  <p className="text-[11px] text-[#7A7670] mt-1 line-clamp-2 leading-relaxed font-serif italic">{p.description}</p>
                </div>
                
                <div className="mt-4 pt-3 border-t border-[#E5E2DD]/50 flex items-center justify-between text-[10px] font-sans text-[#7A7670]">
                  <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider">
                    <Ruler className="w-3.5 h-3.5 text-[#7A7670]/40" />
                    <span>{p.idealPhysicalDimensions.width}W × {p.idealPhysicalDimensions.height}H CM</span>
                  </span>
                  
                  <span className="text-[9px] uppercase tracking-widest text-[#7A7670] group-hover:text-black group-hover:translate-x-1 transition-all">
                    Configure →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
