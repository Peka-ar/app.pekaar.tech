import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalVariant = 'dialog' | 'takeover';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: ModalSize;
  variant?: ModalVariant;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

const sizeStyles: Record<ModalSize, React.CSSProperties> = {
  sm: { width: '100%' },
  md: { width: '100%' },
  lg: { width: '100%' },
  xl: { width: '100%' },
  full: { width: 'calc(100vw - 32px)', height: 'calc(100vh - 32px)' },
};

const firstFocusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  variant = 'dialog',
  footer,
  headerAction,
  children,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<Element | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCloseRef.current();
      return;
    }

    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(firstFocusableSelector);
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(firstFocusableSelector);
        firstFocusable?.focus();
      }
    } else {
      document.body.style.overflow = '';
      if (previouslyFocusedElement.current instanceof HTMLElement) {
        previouslyFocusedElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50',
        variant === 'takeover' && 'bg-black/80'
      )}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        className={cn(
          'bg-[var(--color-surface)] rounded-2xl shadow-xl w-full',
          sizeClasses[size],
          variant === 'takeover' && 'h-full flex flex-col'
        )}
        style={sizeStyles[size]}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-default)]">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="text-sm text-[var(--color-text-muted)] mt-0.5">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <Button variant="ghost" onClick={onClose} leftIcon={<X />} aria-label="Close dialog" />
          </div>
        </div>

        <div className={cn('flex-1 overflow-y-auto px-6 py-4', variant === 'takeover' && 'h-full')}>
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-[var(--color-border-default)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}