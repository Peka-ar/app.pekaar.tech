"use client";
import React, { useRef, useState, useEffect } from 'react';
import Script from "next/script";
import { RotateCcw, Compass, RefreshCw } from 'lucide-react';
import { Product } from "@/lib/types";

const MV = 'model-viewer' as unknown as React.ElementType;

export default function ThreeDConfigurator({ product }: { product: Product }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mvRef = useRef<any>(null);
  const hasInteractedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(() =>
    typeof document !== 'undefined' && document.readyState === 'complete'
  );

  useEffect(() => {
    window.addEventListener('load', () => setPageLoaded(true));
    return () => window.removeEventListener('load', () => setPageLoaded(true));
  }, []);

  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;

    mv.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;

    setLoaded(false);
    setProgress(0);
    setError(null);

    if (!hasInteractedRef.current) {
      mv.cameraOrbit = '0deg 75deg 105%';
      mv.cameraTarget = '0m 0.4m 0m';
      mv.interpolationDecay = 200;
      mv.autoRotate = true;
    }

    const onLoad = () => { setLoaded(true); setProgress(100); };
    const onProgress = (e: CustomEvent) => {
      if (e.detail?.totalProgress != null) {
        setProgress(Math.round(e.detail.totalProgress * 100));
      }
    };
    const onError = () => setError('Failed to load model');
    const onCameraChange = () => { hasInteractedRef.current = true; };

    mv.addEventListener('load', onLoad);
    mv.addEventListener('progress', onProgress);
    mv.addEventListener('error', onError);
    mv.addEventListener('camera-change', onCameraChange);

    return () => {
      mv.removeEventListener('load', onLoad);
      mv.removeEventListener('progress', onProgress);
      mv.removeEventListener('error', onError);
      mv.removeEventListener('camera-change', onCameraChange);
    };
  }, [product.src]);

  const handleResetCamera = () => {
    const mv = mvRef.current;
    if (!mv) return;
    mv.cameraOrbit = '0deg 75deg 105%';
    mv.cameraTarget = '0m 0.4m 0m';
  };

  return (
    <div className="bg-[#F9F8F6] border border-[#E5E2DD] rounded-2xl sm:rounded-3xl overflow-hidden w-full">
      <Script
        src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.2.0/dist/model-viewer.min.js"
        type="module"
        strategy="lazyOnload"
      />
      <div ref={containerRef} className="relative w-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
        <MV
          ref={mvRef}
          src={pageLoaded ? product.src : undefined}
          alt={product.name}
          camera-controls
          disable-pan
          loading="eager"
          reveal="auto"
          shadow-intensity="0.6"
          shadow-softness="0.8"
          exposure="1"
          tone-mapping="aces"
          environment-image="neutral"
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, outline: 'none' }}
        >
          {!loaded && !error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#F9F8F6]" slot="poster">
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#7A7670] animate-spin mb-3" />
              <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#7A7670]">
                {progress > 0 ? `Loading... ${progress}%` : 'Loading 3D Model...'}
              </span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#F9F8F6] p-6" slot="poster">
              <span className="text-xs font-mono text-red-500 text-center max-w-md">{error}</span>
            </div>
          )}
        </MV>

        {/* Product info overlay */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 pointer-events-none">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.25em] text-[#7A7670] font-semibold">{product.brand}</span>
            <h2 className="text-xl sm:text-2xl font-light font-serif italic text-[#1A1A1A]">{product.name}</h2>
          </div>
        </div>

        {loaded && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex flex-col gap-1.5">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              aria-label="Toggle auto rotation"
              className={`p-2.5 sm:p-3 rounded-full border shadow-sm transition-colors duration-200 ${autoRotate ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white border-[#E5E2DD] text-[#7A7670] hover:bg-[#EFEDEA]'}`}
            >
              <RotateCcw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
            </button>
            <button
              onClick={handleResetCamera}
              aria-label="Reset camera"
              className="p-2.5 sm:p-3 rounded-full border border-[#E5E2DD] bg-white hover:bg-[#EFEDEA] text-[#7A7670] shadow-sm transition-colors duration-200"
            >
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
