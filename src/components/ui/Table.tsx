import React from 'react';
import { cn } from './cn';

export interface TableProps {
  className?: string;
  children: React.ReactNode;
}

export function Table({ className, children }: TableProps) {
  return (
    <div className={cn('w-full overflow-auto rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-canvas)]', className)}>
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export interface TableHeadProps {
  className?: string;
  children: React.ReactNode;
}

export function TableHead({ className, children }: TableHeadProps) {
  return (
    <thead className={cn('th-mono bg-[var(--color-canvas-soft)] text-left border-b border-[var(--color-border-default)]', className)}>
      {children}
    </thead>
  );
}

export interface TableBodyProps {
  className?: string;
  children: React.ReactNode;
}

export function TableBody({ className, children }: TableBodyProps) {
  return <tbody className={cn('divide-y divide-[var(--color-border-default)]', className)}>{children}</tbody>;
}

export interface TableRowProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function TableRow({ className, children, onClick }: TableRowProps) {
  return (
    <tr
      className={cn(
        'bg-[var(--color-canvas)] hover:bg-[var(--color-canvas-soft)] transition-colors',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export interface TableCellProps {
  className?: string;
  children: React.ReactNode;
}

export function TableCell({ className, children }: TableCellProps) {
  return (
    <td className={cn('px-3 sm:px-6 py-3 sm:py-4 text-sm text-[var(--color-text-primary)]', className)}>{children}</td>
  );
}

export interface TableEmptyStateProps {
  colSpan: number;
  message?: string;
}

export function TableEmptyState({ colSpan, message = 'No data available' }: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 sm:px-6 py-10 sm:py-12 text-center text-[var(--color-text-muted)]">
        {message}
      </td>
    </tr>
  );
}