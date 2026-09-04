'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

export type DrawerSize = 'sm' | 'md' | 'lg';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: DrawerSize;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

const sizeClasses: Record<DrawerSize, string> = {
  sm: 'w-[400px]',
  md: 'w-[480px]',
  lg: 'w-[640px]',
};

const firstFocusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  headerAction,
  children,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<Element | null>(null);
  const [mounted] = useState(() => typeof document !== 'undefined');
  const [unmounted, setUnmounted] = useState(false);
  const present = isOpen || !unmounted;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(firstFocusableSelector);
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
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => {
        setUnmounted(false);
        const node = drawerRef.current;
        if (node) {
          previouslyFocusedElement.current = document.activeElement;
          document.body.style.overflow = 'hidden';
          document.addEventListener('keydown', handleKeyDown);
          const firstFocusable = node.querySelector<HTMLElement>(firstFocusableSelector);
          firstFocusable?.focus();
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(() => {
      setUnmounted(true);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement.current instanceof HTMLElement) {
        previouslyFocusedElement.current.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isOpen, handleKeyDown]);

  if (!mounted || !present) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const drawerContent = (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[rgba(20,20,16,0.55)] dark:bg-[rgba(20,20,16,0.75)]"
      onClick={handleBackdropClick}
    >
        <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-describedby={description ? 'drawer-description' : undefined}
        className={cn(
          'fixed top-0 right-0 h-full bg-[var(--color-surface)] rounded-l-[24px] flex flex-col',
          'shadow-[var(--shadow-1)]',
          sizeClasses[size],
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-default)]">
          <div>
            <h2 id="drawer-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
              {title}
            </h2>
            {description && (
              <p id="drawer-description" className="text-sm text-[var(--color-text-muted)] mt-0.5">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <Button variant="ghost" onClick={onClose} leftIcon={<X />} aria-label="Close dialog" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--color-border-default)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
