"use client";

import React from "react";
import Image from "next/image";
import { Image as ImageIcon, MessageSquareWarning, Ruler, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { TaskAsset, RevisionRequestLite } from "./types";

/* ── Grouped-section primitives (white cards on the drawer's sage ground) ── */

export function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-[var(--color-canvas)] p-4 sm:p-5", className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  icon: Icon,
  iconClassName,
  children,
}: {
  icon: React.ElementType;
  iconClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-primary)]">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          iconClassName ?? "bg-[var(--surface-sky)] text-[var(--surface-sky-deep)]"
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      </span>
      {children}
    </h3>
  );
}

/* ── Reference images ── */

export function ReferenceGrid({
  assets,
  failed,
  onFail,
  onPreview,
  columns = 4,
}: {
  assets: TaskAsset[];
  failed: Set<string>;
  onFail: (id: string) => void;
  onPreview: (url: string) => void;
  columns?: 2 | 4;
}) {
  if (assets.length === 0) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-default)] p-6 text-center">
        <ImageIcon className="mb-2 h-5 w-5 text-[var(--color-text-muted)]" aria-hidden="true" />
        <p className="text-xs text-[var(--color-text-muted)]">No reference images</p>
      </div>
    );
  }
  return (
    <div className={columns === 2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-4 gap-3"}>
      {assets.map((asset, index) =>
        failed.has(asset.id) ? (
          <div
            key={asset.id}
            title="Image unavailable"
            className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-canvas-soft)] ring-1 ring-[oklch(0_0_0/0.06)]"
          >
            <ImageIcon className="h-5 w-5 text-[var(--color-text-muted)]" aria-hidden="true" />
          </div>
        ) : (
          <button
            key={asset.id}
            type="button"
            onClick={() => onPreview(`/api/v1/assets/${asset.id}/file`)}
            aria-label={`Enlarge reference image ${index + 1}`}
            className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl bg-[var(--color-canvas-soft)] ring-1 ring-[oklch(0_0_0/0.06)] transition-shadow duration-200 hover:ring-[oklch(0_0_0/0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] active:scale-[0.98]"
          >
            <Image
              src={`/api/v1/assets/${asset.id}/file`}
              alt={`Reference ${index + 1}`}
              fill
              sizes={columns === 2 ? "280px" : "(min-width: 640px) 25vw, 50vw"}
              unoptimized
              className="object-cover"
              onError={() => onFail(asset.id)}
            />
          </button>
        )
      )}
    </div>
  );
}

/* ── Revision notes (list only — callers own the section chrome) ── */

export function RevisionTimeline({ items }: { items: RevisionRequestLite[] }) {
  if (!items || items.length === 0) return null;
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return (
    <ol role="log" aria-label="Revision history, newest first" className="space-y-2.5">
      {sorted.map((req) => (
        <li key={req.id} className="rounded-xl bg-[var(--color-canvas-soft)] p-3.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="truncate font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              {req.requester?.name || req.requester?.email || "Brand"}
            </span>
            <time className="shrink-0 font-sans text-[11px] tabular-nums text-[var(--color-text-muted)]">
              {new Date(req.createdAt).toLocaleString()}
            </time>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">
            {req.note}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function RevisionNotesCard({ items }: { items: RevisionRequestLite[] }) {
  return (
    <SectionCard>
      <SectionHeading
        icon={MessageSquareWarning}
        iconClassName="bg-[var(--warning)]/20 text-[var(--warning-content)]"
      >
        Revision notes ({items.length})
      </SectionHeading>
      <RevisionTimeline items={items} />
    </SectionCard>
  );
}

/* ── Lightbox ── */

export function Lightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  React.useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [url, onClose]);
  if (!url) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reference image preview"
      className="lightbox-enter fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div
        className="lightbox-zoom relative max-h-[90vh] w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={url}
          alt="Reference preview"
          width={1024}
          height={768}
          sizes="(min-width: 1024px) 1024px, 100vw"
          unoptimized
          className="mx-auto max-h-[90vh] w-auto max-w-full rounded-2xl object-contain"
        />
      </div>
    </div>
  );
}

/* ── Metadata ── */

export function MetaGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">{children}</dl>;
}

export function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-0.5 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="break-words text-sm font-medium text-[var(--color-text-primary)]">
        {children}
      </dd>
    </div>
  );
}

/* ── Dimensions (compact — own grouped card) ── */

export function DimensionTiles({
  dims,
}: {
  dims: { width?: number; height?: number; depth?: number; unit?: string };
}) {
  const unit = dims.unit || "cm";
  const tiles = [
    { k: "W", v: dims.width },
    { k: "H", v: dims.height },
    { k: "D", v: dims.depth },
  ];
  return (
    <SectionCard>
      <SectionHeading icon={Ruler} iconClassName="bg-[var(--accent-pale)] text-[var(--ink-deep)]">
        Dimensions
      </SectionHeading>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-xl bg-[var(--color-canvas-soft)] px-3 py-2.5">
            <span className="block font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {t.k}
            </span>
            <p className="font-sans text-sm font-semibold tabular-nums leading-tight text-[var(--color-text-primary)]">
              {t.v ?? "–"}
              {t.v != null && (
                <span className="ml-0.5 text-[11px] font-normal text-[var(--color-text-muted)]">
                  {unit}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
