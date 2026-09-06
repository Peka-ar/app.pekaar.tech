import React from 'react';
import { cn } from './cn';

type SkeletonTone = 'default' | 'sage';

const toneClasses: Record<SkeletonTone, string> = {
  default: 'bg-[var(--color-canvas-soft)]',
  sage: 'bg-[var(--canvas)]',
};

export function Skeleton({ className, tone = 'default' }: { className?: string; tone?: SkeletonTone }) {
  return <div className={cn('animate-pulse rounded-lg', toneClasses[tone], className)} aria-hidden="true" />;
}