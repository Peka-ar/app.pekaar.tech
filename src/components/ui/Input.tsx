import React, { forwardRef } from 'react';
import { cn } from './cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, leftIcon, className, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'input-base',
            'w-full',
            !!leftIcon && 'pl-10',
            error && 'input-error border-[var(--negative)] focus:border-[var(--negative)]',
            className
          )}
          {...props}
        />
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-[var(--negative-copy)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';