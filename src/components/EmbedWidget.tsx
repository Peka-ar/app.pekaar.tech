"use client";
import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Compass, Smartphone, RefreshCw, Ruler } from 'lucide-react';
import { Product } from "@/lib/types";

const ModelViewer = 'model-viewer' as any;

interface EmbedWidgetProps {
  product: Product;
  theme?: 'light' | 'dark' | 'glass';
  autoRotateInitial?: boolean;
}

export default function EmbedWidget({
  product,
  theme = 'light',
  autoRotateInitial = false
}: EmbedWidgetProps) {
  const ref = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(autoRotateInitial);

  useEffect(() => {
    const SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.2.0/dist/model-viewer.min.js';
    if (document.querySelector('script[src*="model-viewer"]')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = SRC;
    document.head.appendChild(script);
  }, []);

  const isDark = theme === 'dark';
  const isGlass = theme === 'glass';

  const overlayBg = isDark
    ? 'bg-zinc-900/90 text-zinc-100 border-zinc-800'
    : isGlass
      ? 'bg-white/80 backdrop-blur-md text-stone-900 border-white/40'
      : 'bg-white/95 text-stone-900 border-stone-200/80';

  return (
    <div className={`w-full h-full relative overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-transparent'}`}>
      <ModelViewer
        ref={ref}
        src={product.src}
        alt={product.name}
        camera-controls
        ar
        ar-modes="webxr scene-viewer quick-look"
        shadow-intensity="0.8"
        auto-rotate={autoRotate}
        style={{ width: '100%', height: '100%', outline: 'none' }}
        id={`embed-mv-${product.id}`}
        onLoad={() => setLoaded(true)}
      >
        <button
          slot="ar-button"
          className="absolute bottom-5 right-5 z-20 flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs py-2.5 px-4 rounded-full shadow-lg active:scale-95 transition-colors border border-stone-700"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>View in AR</span>
        </button>

        {!loaded && (
          <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-stone-50/90 backdrop-blur-md'}`}>
            <RefreshCw className="w-6 h-6 text-stone-400 animate-spin mb-2" />
            <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase">Loading 3D...</span>
          </div>
        )}

        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <div className={`px-3 py-1.5 rounded-xl border shadow-sm ${overlayBg} flex items-center gap-2`}>
            <span className="text-[10px] font-mono tracking-tight opacity-70">{product.brand} - {product.name}</span>
          </div>
        </div>

        <div className="absolute top-4 right-4 z-20 flex gap-1.5">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2 rounded-xl border shadow-sm transition-colors ${overlayBg} ${autoRotate ? 'bg-amber-400 border-amber-300 text-stone-900' : ''}`}
            aria-label="Toggle rotation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { if (ref.current) ref.current.cameraOrbit = '0deg 75deg 105%'; }}
            className={`p-2 rounded-xl border shadow-sm ${overlayBg}`}
            aria-label="Reset camera"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
          <div className={`px-2.5 py-1 rounded-lg border shadow-sm ${overlayBg} flex items-center gap-1.5 text-[9px] font-mono`}>
            <Ruler className="w-3 h-3 text-amber-500" />
            <span>{product.idealPhysicalDimensions.width}W x {product.idealPhysicalDimensions.height}H x {product.idealPhysicalDimensions.depth}D cm</span>
          </div>
        </div>
      </ModelViewer>
    </div>
  );
}
