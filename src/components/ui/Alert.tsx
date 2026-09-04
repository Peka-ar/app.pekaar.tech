import React from 'react';
import { cn } from './cn';

export type AlertTone = 'error' | 'warning' | 'success' | 'info';

export interface AlertProps {
  tone: AlertTone;
  children: React.ReactNode;
  className?: string;
}

const toneClasses: Record<AlertTone, string> = {
  error: 'bg-[var(--negative-pale)] text-[var(--negative-copy)] border border-[var(--negative)]/20',
  warning: 'bg-[var(--warning-pale)] text-[var(--warning-copy)] border border-[var(--warning)]/20',
  success: 'bg-[var(--positive-pale)] text-[var(--positive-copy)] border border-[var(--positive)]/20',
  info: 'bg-[var(--accent-pale)] text-[var(--accent-copy)] border border-[var(--accent)]/20',
};

export function Alert({ tone, children, className }: AlertProps) {
  return (
    <div className={cn('px-4 py-3 rounded-xl text-sm', toneClasses[tone], className)}>
      {children}
    </div>
  );
}