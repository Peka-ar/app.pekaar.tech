"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";
import { RotateCcw, Compass, Play, Box, Check } from "lucide-react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { PRODUCTS } from "@/lib/types";
import { EASE } from "./Reveal";

const STAGES = ["CAPTURE", "MODEL", "FINISH", "SERVE"] as const;

const STAGE_DETAILS = [
  {
    label: "Inspect the photos",
    description: "We read the product's shape, visible materials, and supplied dimensions.",
    duration: 2600,
  },
  {
    label: "Build the 3D draft",
    description: "AI drafts the geometry and maps the visible surfaces into a workable model.",
    duration: 3200,
  },
  {
    label: "Finish it by hand",
    description: "A 3D artist refines the geometry, materials, and true-to-life scale.",
    duration: 4000,
  },
  {
    label: "Prepare it for your store",
    description: "We optimize GLB and USDZ files, then package them in one storefront embed.",
    duration: 3000,
  },
] as const;

const PIPELINE_PHOTO = "/velvet_sheen_armchair.jpg";

const MV = "model-viewer" as unknown as React.ElementType;

type Phase = "idle" | "running" | "done";

// The transformation, staged: photo → AI draft → artist finish → live 3D.
// Layers cross-fade inside one fixed-height pane (no layout shift); the
// model-viewer mounts as soon as the run starts so the GLB streams during
// the scripted stages and is ready at reveal.
export default function PipelineCard() {
  const demoProduct = PRODUCTS[0];
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { once: true, margin: "-16% 0px" });
  const reduceMotion = useReducedMotion();
  const autoStartedRef = useRef(false);

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

  // model-viewer event wiring once it mounts (running → done)
  useEffect(() => {
    if (phase === "idle") return;
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

  const runDemo = useCallback(() => {
    clearTimers();
    setPhase("running");
    setActiveIndex(0);
    setLoaded(false);
    setProgress(0);
    setError(null);
    let idx = 0;
    const advance = () => {
      if (idx < STAGES.length - 1) {
        idx += 1;
        setActiveIndex(idx);
        const t = setTimeout(advance, STAGE_DETAILS[idx].duration);
        timersRef.current.push(t);
      } else {
        const t = setTimeout(() => {
          setPhase("done");
          setActiveIndex(STAGES.length);
        }, STAGE_DETAILS[idx].duration);
        timersRef.current.push(t);
      }
    };
    const first = setTimeout(advance, STAGE_DETAILS[0].duration);
    timersRef.current.push(first);
  }, []);

  // Autoplay once on scroll-into-view (the hero wow). Disabled under
  // prefers-reduced-motion — the composed static frame stays instead.
  useEffect(() => {
    if (inView && !reduceMotion && !autoStartedRef.current) {
      autoStartedRef.current = true;
      runDemo();
    }
  }, [inView, reduceMotion, runDemo]);

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

  const running = phase === "running";
  const showPhoto = phase === "idle" || (running && activeIndex === 0);
  const showDraft = running && activeIndex === 1;
  const showFinish = running && activeIndex === 2;
  const showServe = running && activeIndex === 3;
  const showModel = phase !== "idle";
  const modelRevealed = phase === "done";

  return (
    <div
      ref={cardRef}
      className="w-full max-w-[560px] rounded-[24px] p-6 sm:p-7 flex flex-col gap-5"
      style={{ background: "var(--canvas)", border: "1px solid var(--border-ink)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)]">
          Photos → 3D
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-sans uppercase tracking-[0.08em] font-medium"
          style={{ background: "var(--accent-pale)", color: "var(--positive-deep)", border: "1px solid transparent" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--positive)" }} aria-hidden="true" />
          Demo
        </span>
      </div>

      {/* Transformation pane — fixed height, layers cross-fade (no layout shift).
          aria-hidden + inert until done: the scripted layers are decorative and
          the viewer's controls must stay out of the tab order until the demo
          finishes (Replay re-applies both). */}
      <div
        className="relative overflow-hidden rounded-[16px]"
        style={{ background: "var(--canvas-soft)", border: "1px solid var(--border-default)", height: 300 }}
        aria-hidden={phase !== "done" ? "true" : undefined}
        inert={phase !== "done"}
      >
        {/* LAYER: photo — idle + CAPTURE */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: showPhoto ? 1 : 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <Image
            src={PIPELINE_PHOTO}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 560px"
            className="object-cover"
            priority
          />
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--canvas)]/90 backdrop-blur px-2.5 py-1 text-[10px] font-sans font-semibold uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border-default)]">
              {phase === "idle" ? "Your photos" : "Reading photos"}
            </span>
          </div>
        </motion.div>

        {/* LAYER: AI draft — MODEL (scanline + viewfinder over the photo) */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: showDraft ? 1 : 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ pointerEvents: showDraft ? "auto" : "none" }}
        >
          <Image src={PIPELINE_PHOTO} alt="" fill sizes="(max-width: 640px) 100vw, 560px" className="object-cover opacity-50" priority />
          {/* viewfinder corners */}
          <span className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[var(--ink-deep)]" aria-hidden="true" />
          <span className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[var(--ink-deep)]" aria-hidden="true" />
          <span className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[var(--ink-deep)]" aria-hidden="true" />
          <span className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[var(--ink-deep)]" aria-hidden="true" />
          {/* traveling scanline */}
          {showDraft && (
            <motion.span
              className="absolute left-6 right-6 h-[2px] bg-[var(--accent)]"
              aria-hidden="true"
              animate={{ top: ["12%", "84%", "12%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="w-12 h-12 rounded-full bg-[var(--canvas)] border border-[var(--border-ink)] flex items-center justify-center">
              <Box className="w-5 h-5 text-[var(--ink-deep)]" aria-hidden="true" />
            </span>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)] bg-[var(--canvas)]/90 px-2.5 py-1 rounded-full border border-[var(--border-default)]">
              Drafting geometry
            </span>
          </div>
        </motion.div>

        {/* LAYER: artist finish — FINISH (checklist over the photo) */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: showFinish ? 1 : 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ pointerEvents: showFinish ? "auto" : "none" }}
        >
          <Image src={PIPELINE_PHOTO} alt="" fill sizes="(max-width: 640px) 100vw, 560px" className="object-cover" priority />
          <div className="absolute inset-0" style={{ background: "rgba(14,15,12,0.45)" }} aria-hidden="true" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-6">
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Artist pass — by hand
            </span>
            {["Geometry refined", "Materials baked", "Scale checked 1:1"].map((label, i) => (
              <motion.span
                key={label}
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-sans font-semibold"
                style={{ background: "var(--canvas)", color: "var(--text-primary)" }}
                initial={false}
                animate={{ opacity: showFinish ? 1 : 0, y: showFinish ? 0 : 8 }}
                transition={{ duration: 0.4, delay: showFinish ? 0.15 + i * 0.3 : 0, ease: EASE }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: "var(--positive)" }}
                  aria-hidden="true"
                >
                  <Check className="w-2.5 h-2.5" style={{ color: "var(--canvas)" }} />
                </span>
                {label}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* LAYER: serve — SERVE (packing formats) */}
        <motion.div
          className="absolute inset-0 flex-col items-center justify-center gap-3"
          initial={false}
          animate={{ opacity: showServe ? 1 : 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{ display: showServe ? "flex" : "none", background: "var(--canvas-soft)" }}
        >
          <div className="flex items-center gap-2">
            {["GLB", "USDZ"].map((f) => (
              <span
                key={f}
                className="rounded-full px-3.5 py-1.5 text-[11px] font-sans font-semibold uppercase tracking-[0.1em] border"
                style={{ background: "var(--canvas)", color: "var(--text-primary)", borderColor: "var(--border-ink)" }}
              >
                {f}
              </span>
            ))}
          </div>
          <span className="font-mono text-[12px] text-[var(--text-secondary)]">
            {'<iframe src="https://pekar.tech/embed/demo" />'}
          </span>
        </motion.div>

        {/* LAYER: live 3D result — mounts when the run starts (streams during
            the script), revealed at done. Keeps the full viewer logic. */}
        {showModel && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: modelRevealed ? 1 : 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Script
              src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.2.0/dist/model-viewer.min.js"
              type="module"
              strategy="lazyOnload"
            />
            <div className="relative w-full h-full">
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
                    <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      {progress > 0 ? `Loading… ${progress}%` : "Loading 3D…"}
                    </span>
                  </div>
                )}
                {error && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--canvas-soft)] p-6" slot="poster">
                    <span className="text-xs font-sans font-medium text-[var(--negative-deep)] text-center">{error}</span>
                  </div>
                )}
              </MV>

              {loaded && (
                <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoRotate((v) => !v)}
                    aria-label={autoRotate ? "Pause rotation" : "Auto rotate"}
                    aria-pressed={autoRotate}
                    className="w-12 h-12 rounded-full border flex items-center justify-center transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
                    style={{
                      background: autoRotate ? "var(--ink)" : "var(--canvas)",
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
                    className="w-12 h-12 rounded-full border flex items-center justify-center bg-[var(--canvas)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
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
                  className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-sans font-semibold uppercase tracking-widest border shadow-sm"
                  style={{ background: "var(--ink)", color: "var(--on-ink)", borderColor: "var(--ink)" }}
                >
                  View in your space
                </button>
              )}

              <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--canvas)]/90 backdrop-blur px-2.5 py-1 text-[10px] font-sans font-semibold uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border-default)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] animate-pulse" aria-hidden="true" />
                  Demo model · {demoProduct.name}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Persistent narration gives each visual phase enough context to read. */}
      <div
        className="min-h-[104px] rounded-[16px] px-4 py-3.5"
        style={{ background: "var(--canvas-soft)", border: "1px solid var(--border-default)" }}
      >
        {phase === "idle" ? (
          <>
            <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              What you are about to see
            </span>
            <p className="mt-1 font-sans text-[14px] font-semibold text-[var(--text-primary)]">
              One product photo becomes a storefront-ready 3D model.
            </p>
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-[var(--text-secondary)]">
              Follow the four steps below. This walkthrough takes about 13 seconds.
            </p>
          </>
        ) : phase === "done" ? (
          <>
            <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--positive-deep)]">
              Complete · Live 3D
            </span>
            <p className="mt-1 font-sans text-[14px] font-semibold text-[var(--text-primary)]">
              Ready for shoppers to explore.
            </p>
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-[var(--text-secondary)]">
              Rotate the model above, or open it at true scale in AR on a supported device.
            </p>
          </>
        ) : (
          <motion.div
            key={activeIndex}
            initial={reduceMotion ? false : { opacity: 0, transform: "translateY(6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: EASE }}
          >
            <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-deep)]">
              Step {activeIndex + 1} of {STAGES.length} · {STAGES[activeIndex]}
            </span>
            <p className="mt-1 font-sans text-[14px] font-semibold text-[var(--text-primary)]">
              {STAGE_DETAILS[activeIndex].label}
            </p>
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-[var(--text-secondary)]">
              {STAGE_DETAILS[activeIndex].description}
            </p>
          </motion.div>
        )}
      </div>

      {/* Trigger — idle only; the pane carries the show while running */}
      {phase === "idle" && (
        <button
          type="button"
          onClick={runDemo}
          className="group relative flex flex-col items-center justify-center gap-2 rounded-[16px] px-6 py-5 text-center transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
          style={{
            background: "var(--canvas-soft)",
            border: "1.5px dashed rgba(14,15,12,0.35)",
          }}
          aria-label="Run demo — watch the pipeline convert a photo to 3D"
        >
          <span className="text-[14px] font-semibold font-sans text-[var(--text-primary)]">Watch the pipeline run</span>
          <span className="text-[12px] font-sans text-[var(--text-muted)]">13-second walkthrough — no upload needed</span>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-[var(--on-accent)] px-4 py-1.5 text-[13px] font-semibold">
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            Run demo
          </span>
        </button>
      )}

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
                  className="font-sans text-[10px] font-semibold tracking-[0.08em] uppercase text-center leading-none"
                  style={{
                    color: state === "active" ? "var(--ink-deep)" : state === "complete" ? "var(--positive-deep)" : "var(--text-muted)",
                  }}
                >
                  {stage}
                </span>
                {i === 2 && running && activeIndex === 2 && (
                  <span className="font-sans text-[9px] font-semibold tracking-wide text-[var(--text-muted)] hidden sm:block">artist pass — hours</span>
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
        <span className="font-sans text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--text-muted)] text-center sm:hidden -mt-2">
          Finish — artist pass, typically hours
        </span>
      )}
      {phase !== "idle" && phase !== "done" && (
        <p className="sr-only">
          Stage {activeIndex + 1} of {STAGES.length}: {STAGES[activeIndex]}
        </p>
      )}

      {/* Footer row — always visible */}
      <div className="flex flex-col gap-3">
        <div
          className="rounded-[12px] px-3 py-2.5 flex items-center gap-2 overflow-hidden"
          style={{ background: "var(--canvas-soft)", border: "1px solid var(--border-default)" }}
        >
          <span className="font-mono text-[11px] sm:text-[12px] text-[var(--text-secondary)] truncate">
            {'<iframe src="https://pekar.tech/embed/demo" />'}
          </span>
          <span className="ml-auto hidden sm:inline-flex text-[10px] font-sans font-semibold uppercase tracking-widest text-[var(--text-muted)] shrink-0">
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
              Book a demo call
            </Link>
          ) : (
            <>
              <Link href="/auth" className="btn-primary flex-1 justify-center">
                Book a demo call
              </Link>
              <button type="button" onClick={resetDemo} className="btn-secondary">
                Replay
              </button>
            </>
          )}
        </div>
        <p className="font-sans text-[11px] leading-relaxed text-[var(--text-muted)]">
          Demo uses a bundled model — no upload required. Real projects: artist-finished in hours. First model free.
        </p>
      </div>
    </div>
  );
}
