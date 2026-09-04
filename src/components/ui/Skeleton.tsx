import React from 'react';
import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-[var(--color-canvas-soft)] dark:bg-[var(--color-surface)]', className)} aria-hidden="true" />;
}