import React from 'react';
import { cn } from './cn';

export type AlertTone = 'error' | 'warning' | 'success' | 'info';

export interface AlertProps {
  tone: AlertTone;
  children: React.ReactNode;
  className?: string;
}

const toneClasses: Record<AlertTone, string> = {
  error: 'bg-[var(--canvas)] text-[var(--negative-deep)] border border-[var(--negative)]/40',
  warning: 'bg-[var(--canvas)] text-[var(--warning-content)] border border-[var(--warning-deep)]/40',
  success: 'bg-[var(--canvas)] text-[var(--positive-deep)] border border-[var(--positive)]/40',
  info: 'bg-[var(--canvas)] text-[var(--ink-deep)] border border-[var(--accent)]/40',
};

export function Alert({ tone, children, className }: AlertProps) {
  return (
    <div className={cn('px-4 py-3 rounded-xl text-sm', toneClasses[tone], className)}>
      {children}
    </div>
  );
}