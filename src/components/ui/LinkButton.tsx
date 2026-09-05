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
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'inline-flex items-center justify-center gap-2 font-semibold text-[var(--color-text-primary)] bg-transparent hover:bg-[var(--color-canvas-soft)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] active:scale-[0.98]',
  destructive: 'inline-flex items-center justify-center gap-2 font-semibold bg-[var(--negative)] text-white rounded-[24px] hover:bg-[var(--negative-deep)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] active:scale-[0.98]',
};

const sizeClasses: Record<LinkButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-6 text-base',
  lg: 'h-12 px-8 text-base',
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
  const iconOnly = !children;
  const isGhost = variant === 'ghost';
  return (
    <Link
      href={href}
      className={cn(
        variantClasses[variant],
        isGhost && (iconOnly ? 'rounded-full' : 'rounded-[24px]'),
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