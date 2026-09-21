import React from 'react';
import { cn } from '@/components/ui/cn';

interface ChartBarsProps {
  counts: number[];
  labels: string[];
  noun: string;
  emptyTitle: string;
  emptyHint: string;
  emptyIcon?: React.ReactNode;
  className?: string;
  /** Override the bar fill (display-only). Defaults to the lime accent. */
  barClassName?: string;
}

export function ChartBars({
  counts,
  labels,
  noun,
  emptyTitle,
  emptyHint,
  emptyIcon,
  className,
  barClassName = 'bg-[var(--color-accent)] group-hover:bg-[var(--color-accent-active)]',
}: ChartBarsProps) {
  const total = counts.reduce((sum, n) => sum + n, 0);
  const maxCount = Math.max(1, ...counts);

  if (total === 0) {
    return (
      <div
        className={cn(
          'h-56 w-full flex flex-col items-center justify-center gap-2 text-center rounded-2xl bg-[var(--color-canvas-soft)]',
          className
        )}
      >
        {emptyIcon && <span className="text-[var(--color-text-muted)]">{emptyIcon}</span>}
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{emptyTitle}</p>
        <p className="text-xs text-[var(--color-text-muted)] max-w-xs leading-relaxed">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="h-64 w-full flex items-end gap-2 sm:gap-4 relative pt-10">
        <div className="absolute inset-x-0 top-10 border-t border-dashed border-[var(--color-border-default)] w-full" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--color-border-default)] w-full" />
        <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-[var(--color-border-default)] w-full" />
        {counts.map((count, i) => (
          <div
            key={i}
            role="img"
            aria-label={`${labels[i]}: ${count.toLocaleString()} ${count === 1 ? noun : `${noun}s`}`}
            className="flex-1 flex flex-col justify-end h-full z-10 group cursor-crosshair"
          >
            <div
              className={cn(
                'w-full rounded-t-sm transition-[background-color] relative',
                barClassName
              )}
              style={{
                height: `${(count / maxCount) * 100}%`,
                maxHeight: 'calc(100% - 24px)',
              }}
            >
              <div aria-hidden="true" className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-canvas)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] shadow-[var(--shadow-1)] text-[10px] font-sans tabular-nums px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {count.toLocaleString()} {count === 1 ? noun : `${noun}s`}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] font-sans tracking-widest text-[var(--color-text-muted)]">
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </div>
  );
}
