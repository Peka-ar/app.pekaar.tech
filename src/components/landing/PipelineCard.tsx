"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { RotateCcw, Compass, Image as ImageIcon, Play } from "lucide-react";
import { PRODUCTS } from "@/lib/types";

const STAGES = ["CAPTURE", "MODEL", "FINISH", "SERVE"] as const;

const MV = "model-viewer" as unknown as React.ElementType;

export default function PipelineCard() {
  const demoProduct = PRODUCTS[0];
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // result viewer state
  const mvRef = useRef<HTMLElement & { cameraOrbit?: string; cameraTarget?: string; autoRotate?: boolean; canActivateAR?: boolean } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [arSupported, setArSupported] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(() =>
    typeof document !== "undefined" ? document.readyState === "complete" : false
  );

  useEffect(() => {
    const onLoad = () => setPageLoaded(true);
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // model-viewer event wiring when done
  useEffect(() => {
    if (phase !== "done") return;
    const mv = mvRef.current as unknown as HTMLElement & {
      addEventListener: (a: string, b: EventListener) => void;
      removeEventListener: (a: string, b: EventListener) => void;
      autoRotate?: boolean;
      cameraOrbit?: string;
      cameraTarget?: string;
      interpolationDecay?: number;
      canActivateAR?: boolean;
    };
    if (!mv) return;

    const onLoad = () => {
      setLoaded(true);
      setProgress(100);
      const el = mv as unknown as { canActivateAR?: boolean };
      setArSupported(Boolean(el.canActivateAR));
    };
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.totalProgress != null) setProgress(Math.round(detail.totalProgress * 100));
    };
    const onError = () => setError("Failed to load model");

    mv.addEventListener("load", onLoad as EventListener);
    mv.addEventListener("progress", onProgress as EventListener);
    mv.addEventListener("error", onError as EventListener);

    return () => {
      mv.removeEventListener("load", onLoad as EventListener);
      mv.removeEventListener("progress", onProgress as EventListener);
      mv.removeEventListener("error", onError as EventListener);
    };
  }, [phase, demoProduct.src]);

  useEffect(() => {
    const el = mvRef.current as unknown as { autoRotate?: boolean } | null;
    if (el) el.autoRotate = autoRotate;
  }, [autoRotate]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const runDemo = () => {
    clearTimers();
    setPhase("running");
    setActiveIndex(0);
    setLoaded(false);
    setProgress(0);
    setError(null);
    // timings: CAPTURE 1.2s, MODEL 1.2s, FINISH 1.8s, SERVE 1.2s
    const timings = [1200, 1200, 1800, 1200];
    let idx = 0;
    const advance = () => {
      if (idx < STAGES.length - 1) {
        idx += 1;
        setActiveIndex(idx);
        const t = setTimeout(advance, timings[idx]);
        timersRef.current.push(t);
      } else {
        const t = setTimeout(() => {
          setPhase("done");
          setActiveIndex(STAGES.length);
        }, timings[idx]);
        timersRef.current.push(t);
      }
    };
    const first = setTimeout(advance, timings[0]);
    timersRef.current.push(first);
  };

  const resetDemo = () => {
    clearTimers();
    setPhase("idle");
    setActiveIndex(-1);
    setLoaded(false);
    setProgress(0);
    setError(null);
    setArSupported(false);
  };

  const handleResetCamera = () => {
    const mv = mvRef.current as unknown as { cameraOrbit?: string; cameraTarget?: string } | null;
    if (!mv) return;
    mv.cameraOrbit = "0deg 75deg 105%";
    mv.cameraTarget = "0m 0.4m 0m";
  };

  const getDotState = (i: number): "pending" | "active" | "complete" => {
    if (phase === "done") return "complete";
    if (phase === "idle") return "pending";
    if (i < activeIndex) return "complete";
    if (i === activeIndex) return "active";
    return "pending";
  };

  return (
    <div
      className="w-full max-w-[560px] rounded-[24px] p-6 sm:p-7 flex flex-col gap-5"
      style={{ background: "var(--surface)", border: "none" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-[var(--text-muted)]">
          Photos → 3D
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.08em] font-medium"
          style={{ background: "var(--positive-pale)", color: "var(--positive-copy)", border: "1px solid transparent" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--positive)" }} aria-hidden="true" />
          Demo
        </span>
      </div>

      {/* Drop zone — idle / running placeholder, hidden when done is showing result */}
      {phase !== "done" ? (
        <button
          type="button"
          onClick={runDemo}
          className="group relative flex flex-col items-center justify-center gap-2 rounded-[16px] px-6 py-8 text-center transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
          style={{
            background: "var(--canvas-soft)",
            border: "1.5px dashed var(--border-default)",
            minHeight: 132,
          }}
          aria-label="Run demo — drop a product photo"
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border-default)] group-hover:border-[var(--accent)] transition-colors">
            <ImageIcon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-copy)]" aria-hidden="true" />
          </span>
          <span className="text-[14px] font-semibold font-sans text-[var(--text-primary)]">Drop a product photo</span>
          <span className="text-[12px] font-sans text-[var(--text-muted)]">or watch the demo run</span>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-[var(--on-accent)] px-4 py-1.5 text-[13px] font-semibold">
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            Run demo
          </span>
        </button>
      ) : null}

      {/* Pipeline strip */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Pipeline progress"
        className="rounded-[12px] px-3 py-3 flex items-center justify-between gap-1"
        style={{ background: "var(--canvas-soft)", border: "1px solid transparent" }}
      >
        {STAGES.map((stage, i) => {
          const state = getDotState(i);
          return (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"
                  style={{
                    background:
                      state === "pending"
                        ? "var(--border-default)"
                        : state === "active"
                          ? "var(--accent)"
                          : "var(--positive)",
                    boxShadow: state === "active" ? "0 0 0 4px var(--accent-pale)" : "none",
                  }}
                  aria-hidden="true"
                />
                <span
                  className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase text-center leading-none"
                  style={{
                    color: state === "active" ? "var(--accent-copy)" : state === "complete" ? "var(--positive-copy)" : "var(--text-muted)",
                  }}
                >
                  {stage}
                </span>
                {i === 2 && phase === "running" && activeIndex === 2 && (
                  <span className="font-mono text-[9px] tracking-wide text-[var(--text-muted)] hidden sm:block">artist pass — hours</span>
                )}
              </div>
              {i < STAGES.length - 1 && (
                <span className="h-px flex-1 max-w-[24px] sm:max-w-[40px] bg-[var(--border-default)] hidden sm:block" aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {phase === "running" && activeIndex === 2 && (
        <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-muted)] text-center sm:hidden -mt-2">
          Finish — artist pass, typically hours
        </span>
      )}
      {phase !== "idle" && phase !== "done" && (
        <p className="sr-only">
          Stage {activeIndex + 1} of {STAGES.length}: {STAGES[activeIndex]}
        </p>
      )}

      {/* Result pane — reserved min-height to avoid layout shift */}
      <div
        className="relative overflow-hidden rounded-[16px] border"
        style={{
          background: "var(--canvas-soft)",
          borderColor: "var(--border-default)",
          minHeight: phase === "done" ? 280 : 0,
          display: phase === "done" ? "block" : "none",
        }}
      >
        {phase === "done" && (
          <>
            <Script
              src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.2.0/dist/model-viewer.min.js"
              type="module"
              strategy="lazyOnload"
            />
            <div className="relative w-full h-[280px] sm:h-[300px]">
              <MV
                ref={mvRef as unknown as React.RefObject<unknown>}
                src={pageLoaded ? demoProduct.src : undefined}
                ios-src={demoProduct.usdz}
                alt={demoProduct.name}
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
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--canvas-soft)]" slot="poster">
                    <span className="w-5 h-5 border-2 border-[var(--border-default)] border-t-[var(--text-primary)] rounded-full animate-spin mb-2" aria-hidden="true" />
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                      {progress > 0 ? `Loading… ${progress}%` : "Loading 3D…"}
                    </span>
                  </div>
                )}
                {error && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--canvas-soft)] p-6" slot="poster">
                    <span className="text-xs font-mono text-[var(--negative-copy)] text-center">{error}</span>
                  </div>
                )}
              </MV>

              {/* rotate / reset */}
              {loaded && (
                <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoRotate((v) => !v)}
                    aria-label={autoRotate ? "Pause rotation" : "Auto rotate"}
                    aria-pressed={autoRotate}
                    className="w-12 h-12 rounded-full border flex items-center justify-center transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
                    style={{
                      background: autoRotate ? "var(--ink)" : "var(--surface)",
                      color: autoRotate ? "var(--on-ink)" : "var(--text-muted)",
                      borderColor: autoRotate ? "var(--ink)" : "var(--border-default)",
                    }}
                  >
                    <RotateCcw className={`w-4 h-4 ${autoRotate ? "animate-spin" : ""}`} style={{ animationDuration: "8s" }} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetCamera}
                    aria-label="Reset camera"
                    className="w-12 h-12 rounded-full border flex items-center justify-center bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
                    style={{ borderColor: "var(--border-default)" }}
                  >
                    <Compass className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {loaded && arSupported && (
                <button
                  type="button"
                  slot="ar-button"
                  aria-label="View in your space"
                  className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-mono uppercase tracking-widest border shadow-sm"
                  style={{ background: "var(--ink)", color: "var(--on-ink)", borderColor: "var(--ink)" }}
                >
                  View in your space
                </button>
              )}

              <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)]/90 backdrop-blur px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border-default)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] animate-pulse" aria-hidden="true" />
                  Demo model · {demoProduct.name}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer row — always visible */}
      <div className="flex flex-col gap-3">
        <div
          className="rounded-[12px] px-3 py-2.5 flex items-center gap-2 overflow-hidden"
          style={{ background: "var(--canvas-soft)", border: "1px solid var(--border-default)" }}
        >
          <span className="font-mono text-[11px] sm:text-[12px] text-[var(--text-secondary)] truncate">
            {'<iframe src="https://pekar.tech/embed/demo" />'}
          </span>
          <span className="ml-auto hidden sm:inline-flex text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] shrink-0">
            code
          </span>
        </div>
        <div className="flex items-center gap-2">
          {phase !== "done" ? (
            <Link
              href="/auth"
              className="btn-primary flex-1 sm:flex-none inline-flex justify-center"
              style={{ height: 48 }}
            >
              Start your project
            </Link>
          ) : (
            <>
              <Link href="/auth" className="btn-primary flex-1 justify-center">
                Start your project
              </Link>
              <button type="button" onClick={resetDemo} className="btn-secondary">
                Replay
              </button>
            </>
          )}
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-[var(--text-muted)]">
          Demo uses a bundled model — no upload required. Real projects: artist-finished in hours.
        </p>
      </div>
    </div>
  );
}
