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
    <div className="flex items-center gap-2 bg-white border border-[#E5E2DD] p-1 rounded-xl shadow-sm">
      {(['7D', '30D', 'ALL'] as const).map((rangeOption) => (
        <button
          key={rangeOption}
          onClick={() => handleRangeChange(rangeOption)}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] ${
            currentRange === rangeOption
              ? 'bg-[#1A1A1A] text-white font-bold'
              : 'text-[#7A7670] hover:bg-[#EFEDEA] hover:text-[#1A1A1A]'
          }`}
          disabled={isPending}
        >
          {rangeOption === 'ALL' ? 'All Time' : rangeOption}
        </button>
      ))}
      {isPending && (
        <div className="flex items-center gap-1 px-2">
          <Loader2 className="w-3 h-3 animate-spin text-[#7A7670]" />
        </div>
      )}
    </div>
  );
}