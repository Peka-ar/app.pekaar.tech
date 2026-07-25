import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor: string;
}

export function Label({ htmlFor, children, className, ...props }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-[11px] font-mono tracking-widest uppercase text-[var(--color-text-muted)] font-bold ${className || ''}`}
      {...props}
    >
      {children}
    </label>
  );
}