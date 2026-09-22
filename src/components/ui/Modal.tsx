import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
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
  '2xl': 'max-w-2xl',
  full: 'max-w-full mx-4',
};

const sizeStyles: Record<ModalSize, React.CSSProperties> = {
  sm: { width: '100%' },
  md: { width: '100%' },
  lg: { width: '100%' },
  xl: { width: '100%' },
  '2xl': { width: '100%' },
  full: { width: 'calc(100vw - 32px)', height: 'calc(100dvh - 32px)' },
};

const firstFocusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const overlayContainers = new Set<HTMLElement>();
const previousInert = new Map<Element, boolean>();

function syncBackgroundInert() {
  for (const child of Array.from(document.body.children)) {
    const el = child as HTMLElement;
    if (overlayContainers.has(el)) {
      el.inert = false;
      previousInert.delete(el);
      continue;
    }
    if (!previousInert.has(el)) previousInert.set(el, el.inert);
    el.inert = true;
  }
}

function restoreBackgroundInert() {
  for (const child of Array.from(document.body.children)) {
    const el = child as HTMLElement;
    if (overlayContainers.has(el)) {
      el.inert = false;
      continue;
    }
    if (previousInert.has(el)) {
      el.inert = previousInert.get(el) ?? false;
      previousInert.delete(el);
    }
  }
}

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
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = document.createElement('div');
    overlayContainers.add(node);
    document.body.appendChild(node);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalNode(node);
    return () => {
      overlayContainers.delete(node);
      restoreBackgroundInert();
      node.remove();
    };
  }, []);

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
    if (isOpen && portalNode) {
      overlayContainers.add(portalNode);
      syncBackgroundInert();
    } else if (portalNode) {
      overlayContainers.delete(portalNode);
      restoreBackgroundInert();
    }
  }, [isOpen, portalNode]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!portalNode || !isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        variant === 'takeover' ? 'bg-black/80' : 'bg-black/55'
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
          'flex w-full flex-col overflow-hidden rounded-[24px] bg-[var(--color-canvas)]',
          'max-h-[calc(100dvh-32px)]',
          'shadow-[var(--shadow-2)]',
          sizeClasses[size],
          variant === 'takeover' && 'h-full'
        )}
        style={sizeStyles[size]}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border-default)] px-6 py-4">
          <div>
            <h2 id="modal-title" className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-[var(--color-border-default)] px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, portalNode);
}