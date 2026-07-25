'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useCallback } from 'react';
import { Loader2 } from 'lucide-react';

type DateRange = '7D' | '30D' | 'ALL';

interface DateRangePickerProps {
  currentRange: DateRange;
}

export function DateRangePicker({ currentRange }: DateRangePickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRangeChange = useCallback((range: DateRange) => {
    startTransition(() => {
      router.push(`/analytics?range=${range}`, { scroll: false });
    });
  }, [router]);

  return (
    <div className="flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border-default)] p-1 rounded-xl shadow-sm">
      {(['7D', '30D', 'ALL'] as const).map((rangeOption) => (
        <button
          key={rangeOption}
          onClick={() => handleRangeChange(rangeOption)}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] ${
            currentRange === rangeOption
              ? 'bg-[var(--color-text-primary)] text-[var(--color-canvas)] font-bold'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-canvas-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          disabled={isPending}
        >
          {rangeOption === 'ALL' ? 'All Time' : rangeOption}
        </button>
      ))}
      {isPending && (
        <div className="flex items-center gap-1 px-2">
          <Loader2 className="w-3 h-3 animate-spin text-[var(--color-text-muted)]" />
        </div>
      )}
    </div>
  );
}