import React from 'react';
import { Label } from './Label';

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-[var(--negative)] ml-1">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-[var(--negative-copy)]">
          {error}
        </p>
      )}
    </div>
  );
}