import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor: string;
}

export function Label({ htmlFor, children, className, ...props }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-semibold text-[var(--color-text-secondary)] ${className || ''}`}
      {...props}
    >
      {children}
    </label>
  );
}