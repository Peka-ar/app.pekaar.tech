"use client";

import React from "react";
import { Box } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { TaskJob } from "./types";
import { TaskCard } from "./TaskCard";

export type BoardColumn = {
  id: string;
  label: string;
  icon: React.ElementType;
  headerChip: string;
};

export function TaskColumn({
  column,
  jobs,
  getLabel,
  getMeta,
  renderAction,
  onOpen,
  emptyHint,
}: {
  column: BoardColumn;
  jobs: TaskJob[];
  getLabel: (job: TaskJob) => string;
  getMeta: (job: TaskJob) => string;
  renderAction?: (job: TaskJob) => React.ReactNode;
  onOpen: (job: TaskJob) => void;
  emptyHint?: string;
}) {
  const ColIcon = column.icon;
  return (
    <section
      aria-label={`${column.label} column, ${jobs.length} tasks`}
      className="task-column p-4"
    >
      <div className="mb-3 flex items-center justify-between border-b border-[var(--color-border-default)] pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              column.headerChip
            )}
          >
            <ColIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </span>
          <h3 className="label-mono truncate text-[var(--color-text-primary)]">{column.label}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-canvas-soft)] px-2.5 py-0.5 font-sans text-[11px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
          {jobs.length}
        </span>
      </div>

      <div className="task-column-scroll">
        {jobs.map((job, index) => (
          <TaskCard
            key={job.id}
            job={job}
            label={getLabel(job)}
            meta={getMeta(job)}
            action={renderAction?.(job)}
            onOpen={onOpen}
            enterDelay={Math.min(index, 8) * 30}
          />
        ))}
        {jobs.length === 0 && (
          <div className="flex min-h-[140px] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-default)] p-6 text-center">
            <span
              className={cn(
                "mb-2 flex h-9 w-9 items-center justify-center rounded-full",
                column.headerChip
              )}
            >
              <Box className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
            {emptyHint && (
              <span className="max-w-[180px] text-xs leading-relaxed text-[var(--color-text-muted)]">
                {emptyHint}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
