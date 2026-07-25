import React from 'react';
import { cn } from './cn';

export type AlertTone = 'error' | 'warning' | 'success' | 'info';

export interface AlertProps {
  tone: AlertTone;
  children: React.ReactNode;
  className?: string;
}

const toneClasses: Record<AlertTone, string> = {
  error: 'bg-red-50 text-red-800 border border-red-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  info: 'bg-blue-50 text-blue-800 border border-blue-200',
};

export function Alert({ tone, children, className }: AlertProps) {
  return (
    <div className={cn('px-4 py-3 rounded-lg text-sm', toneClasses[tone], className)}>
      {children}
    </div>
  );
}