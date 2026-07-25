import React from 'react';
import Link from 'next/link';
import { cn } from './cn';

export type LinkButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type LinkButtonSize = 'sm' | 'md' | 'lg';

export interface LinkButtonProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<LinkButtonVariant, string> = {
  primary: 'btn-primary active:scale-95',
  secondary: 'btn-secondary active:scale-95',
  ghost: 'text-[var(--color-text-primary)] hover:bg-[var(--color-canvas-secondary)] rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]',
  destructive: 'bg-red-600 text-white rounded-full text-[10px] uppercase tracking-widest font-medium active:scale-95 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]',
};

const sizeClasses: Record<LinkButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[10px]',
  md: 'px-5 py-2.5 text-[11px]',
  lg: 'px-8 py-3.5 text-[12px]',
};

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  children,
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        'inline-flex items-center justify-center gap-2 font-medium',
        className
      )}
      {...props}
    >
      {leftIcon && leftIcon}
      {children}
      {rightIcon && rightIcon}
    </Link>
  );
}