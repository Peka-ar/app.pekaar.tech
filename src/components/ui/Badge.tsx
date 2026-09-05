import React from 'react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'inverted';

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--canvas-soft)] text-[var(--text-secondary)] border border-transparent',
  success: 'bg-[var(--accent-pale)] text-[var(--positive-deep)] border border-transparent',
  warning: 'bg-[var(--warning)] text-[var(--warning-content)] border border-transparent',
  danger: 'bg-[var(--negative-bg)] text-white border border-transparent',
  info: 'bg-[var(--canvas-soft)] text-[var(--ink-deep)] border border-[var(--ink-deep)]/20',
  inverted: 'bg-[var(--ink)] text-[var(--on-ink)] border border-transparent',
};

export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'pill inline-flex items-center gap-1.5',
        toneClasses[tone],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}