import React from 'react';
import { cn } from './cn';

export type CardVariant = 'default' | 'inverted' | 'muted';

export interface CardProps {
  variant?: CardVariant;
  lined?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-[var(--color-surface)]',
  inverted: 'bg-[var(--ink)] text-[var(--on-ink)]',
  muted: 'bg-[var(--color-canvas-soft)]',
};

export function Card({ variant = 'default', lined = false, className, children }: CardProps) {
  return (
    <div className={cn(lined ? 'card-lined' : 'card', variantClasses[variant], className)}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-5 border-b border-[var(--color-border-default)]', className)}>
      {children}
    </div>
  );
}

export interface CardTitleProps {
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
  children: React.ReactNode;
}

export function CardTitle({ as: Tag = 'h3', className, children }: CardTitleProps) {
  return (
    <Tag className={cn('text-lg font-semibold text-[var(--color-text-primary)]', className)}>
      {children}
    </Tag>
  );
}

export interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function CardDescription({ className, children }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-[var(--color-text-muted)] mt-1', className)}>
      {children}
    </p>
  );
}

export interface CardBodyProps {
  className?: string;
  children: React.ReactNode;
}

export function CardBody({ className, children }: CardBodyProps) {
  return (
    <div className={cn('px-6 py-5', className)}>
      {children}
    </div>
  );
}

export interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function CardFooter({ className, children }: CardFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-[var(--color-border-default)]', className)}>
      {children}
    </div>
  );
}