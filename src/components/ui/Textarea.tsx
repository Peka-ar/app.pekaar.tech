import React, { forwardRef } from 'react';
import { cn } from './cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <div>
        <textarea
          ref={ref}
          className={cn(
            'input-base',
            'w-full px-4 py-2.5 min-h-[100px] resize-y',
            error && 'border-red-500 focus:border-red-500 focus:outline-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';