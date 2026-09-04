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
  ghost: 'inline-flex items-center justify-center gap-2 font-medium text-[var(--accent-copy)] hover:underline rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]',
  destructive: 'inline-flex items-center justify-center gap-2 font-semibold bg-[var(--negative)] text-white rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] active:scale-[0.98]',
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