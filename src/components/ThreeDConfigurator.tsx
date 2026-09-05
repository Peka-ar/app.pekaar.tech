"use client";
import React, { useRef, useState, useEffect } from "react";
import Script from "next/script";
import { RotateCcw, Compass, RefreshCw, Smartphone } from "lucide-react";
import { Product } from "@/lib/types";

const MV = "model-viewer" as unknown as React.ElementType;

export default function ThreeDConfigurator({ product }: { product: Product }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mvRef = useRef<any>(null);
  const hasInteractedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [arSupported, setArSupported] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(() =>
    typeof document !== "undefined" && document.readyState === "complete"
  );

  useEffect(() => {
    window.addEventListener("load", () => setPageLoaded(true));
    return () => window.removeEventListener("load", () => setPageLoaded(true));
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
      mv.cameraOrbit = "0deg 75deg 105%";
      mv.cameraTarget = "0m 0.4m 0m";
      mv.interpolationDecay = 200;
      mv.autoRotate = true;
    }

    const onLoad = () => {
      setLoaded(true);
      setProgress(100);
      setArSupported(Boolean(mv.canActivateAR));
    };
    const onProgress = (e: CustomEvent) => {
      if (e.detail?.totalProgress != null) {
        setProgress(Math.round(e.detail.totalProgress * 100));
      }
    };
    const onError = () => setError("Failed to load model");
    const onCameraChange = () => {
      hasInteractedRef.current = true;
    };

    mv.addEventListener("load", onLoad);
    mv.addEventListener("progress", onProgress);
    mv.addEventListener("error", onError);
    mv.addEventListener("camera-change", onCameraChange);

    return () => {
      mv.removeEventListener("load", onLoad);
      mv.removeEventListener("progress", onProgress);
      mv.removeEventListener("error", onError);
      mv.removeEventListener("camera-change", onCameraChange);
    };
  }, [product.src]);

  const handleResetCamera = () => {
    const mv = mvRef.current;
    if (!mv) return;
    mv.cameraOrbit = "0deg 75deg 105%";
    mv.cameraTarget = "0m 0.4m 0m";
  };

  return (
    <div className="rounded-[24px] overflow-hidden w-full" style={{ background: "var(--canvas)" }}>
      <Script
        src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.2.0/dist/model-viewer.min.js"
        type="module"
        strategy="lazyOnload"
      />
      <div ref={containerRef} className="relative w-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
        <MV
          ref={mvRef}
          src={pageLoaded ? product.src : undefined}
          ios-src={product.usdz}
          alt={product.name}
          camera-controls
          disable-pan
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="fixed"
          loading="eager"
          reveal="auto"
          shadow-intensity="0.6"
          shadow-softness="0.8"
          exposure="1"
          tone-mapping="aces"
          environment-image="neutral"
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0, outline: "none" }}
        >
          {!loaded && !error && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center"
              style={{ background: "var(--canvas-soft)" }}
              slot="poster"
            >
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-muted)] animate-spin mb-3" aria-hidden="true" />
              <span className="text-[12px] font-sans font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {progress > 0 ? `Loading... ${progress}%` : "Loading 3D Model..."}
              </span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6" style={{ background: "var(--canvas-soft)" }} slot="poster">
              <span className="text-xs font-sans font-medium text-[var(--negative-deep)] text-center max-w-md">{error}</span>
            </div>
          )}

          {loaded && arSupported && (
            <button
              type="button"
              slot="ar-button"
              aria-label="View in your space"
              className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex items-center gap-1.5 sm:gap-2 rounded-full px-4 py-2.5 text-[11px] sm:text-xs font-sans font-semibold uppercase tracking-[0.08em] border shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
              style={{ background: "var(--ink)", color: "var(--on-ink)", borderColor: "var(--ink)" }}
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span>View in your space</span>
            </button>
          )}
        </MV>

        {/* Product info overlay */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 pointer-events-none">
          <div className="flex flex-col gap-1">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {product.brand} · Demo
            </span>
            <h3 className="font-sans font-semibold text-[18px] sm:text-[20px] tracking-[-0.01em] text-[var(--text-primary)]">{product.name}</h3>
          </div>
        </div>

        {loaded && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex flex-col gap-2">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              aria-label="Toggle auto rotation"
              aria-pressed={autoRotate}
              className="w-12 h-12 rounded-full border shadow-sm transition-colors flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
              style={{
                background: autoRotate ? "var(--ink)" : "var(--canvas)",
                color: autoRotate ? "var(--on-ink)" : "var(--text-muted)",
                borderColor: autoRotate ? "var(--ink)" : "var(--border-default)",
              }}
            >
              <RotateCcw className={`w-4 h-4 ${autoRotate ? "animate-spin" : ""}`} style={{ animationDuration: "8s" }} aria-hidden="true" />
            </button>
            <button
              onClick={handleResetCamera}
              aria-label="Reset camera"
              className="w-12 h-12 rounded-full border shadow-sm flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
              style={{ background: "var(--canvas)", borderColor: "var(--border-default)", color: "var(--text-muted)" }}
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
