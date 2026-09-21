"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Box as BoxIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PROJECT_STATUS_META } from "@/lib/status";
import { getThumbnail, type TaskJob } from "./types";

export function TaskCard({
  job,
  label,
  meta,
  action,
  onOpen,
  enterDelay,
}: {
  job: TaskJob;
  label: string;
  meta: string;
  action?: React.ReactNode;
  onOpen: (job: TaskJob) => void;
  enterDelay?: number;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const thumb = getThumbnail(job);
  const showThumb = Boolean(thumb) && !thumbFailed;
  const statusMeta = PROJECT_STATUS_META[job.status];
  const StatusIcon = statusMeta.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${job.name}`}
      title={`${job.name} · ${job.id}`}
      onClick={() => onOpen(job)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(job);
        }
      }}
      className="task-card-enter group shrink-0 cursor-pointer rounded-2xl bg-[var(--color-canvas)] p-2.5 ring-1 ring-[oklch(0_0_0/0.06)] transition-[box-shadow,transform] duration-200 ease-out hover:shadow-[var(--shadow-1)] hover:ring-[oklch(0_0_0/0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] active:scale-[0.98]"
      style={enterDelay ? { animationDelay: `${enterDelay}ms` } : undefined}
    >
      <div className="relative mb-2.5 aspect-[5/3] w-full overflow-hidden rounded-xl bg-[var(--color-canvas-soft)]">
        {showThumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            sizes="320px"
            unoptimized
            onError={() => setThumbFailed(true)}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BoxIcon className="h-6 w-6 text-[var(--color-text-muted)]" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 px-1">
        <h4 className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-[var(--color-text-primary)]">
          {job.name}
        </h4>
        <span className="-mt-0.5 shrink-0">
          <Badge tone={statusMeta.tone} icon={<StatusIcon className="h-3 w-3" aria-hidden="true" />}>
            {label}
          </Badge>
        </span>
      </div>
      <div className="flex items-center gap-2 px-1 pb-1 pt-0.5">
        <p className="truncate flex-1 text-xs text-[var(--color-text-muted)]">{meta}</p>
        {job.generationMode === "FAST" && (
          <span className="shrink-0 rounded-full bg-[var(--surface-sky)]/30 px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-[var(--surface-sky-deep)]">
            AI Draft
          </span>
        )}
      </div>

      {action && (
        <div
          className="mt-1.5 border-t border-[var(--color-border-default)] px-1 pt-2.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {action}
        </div>
      )}
    </div>
  );
}
