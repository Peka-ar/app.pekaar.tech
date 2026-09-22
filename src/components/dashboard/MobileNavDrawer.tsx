"use client";
import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from "@appwrite.io/react";
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';
import Image from 'next/image';
import { logout } from '@/app/actions/auth';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  pathname: string;
}

const firstFocusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function MobileNavDrawer({ isOpen, onClose, navItems, pathname }: MobileNavDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<Element | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const { user } = useAuth();

  const userName = user?.name?.trim() || user?.email?.split("@")[0] || "Brand";
  const userEmail = user?.email || "";
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() || "")
    .join("") || "BR";

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
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
      previouslyFocusedElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(firstFocusableSelector);
      firstFocusable?.focus();
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement.current instanceof HTMLElement) {
        previouslyFocusedElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleLinkClick = () => {
    onClose();
  };

  const drawerContent = (
    <div
      className={cn(
        'fixed inset-0 z-50 md:hidden transition-opacity duration-200 ease-out',
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
      onClick={handleBackdropClick}
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'absolute top-0 left-0 h-full w-72 shadow-[var(--shadow-2)] transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ backgroundColor: 'var(--canvas)' }}
      >
        <div
          className="h-16 flex items-center justify-between px-6"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <Link href="/" className="flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]" aria-label="Go to Home" onClick={handleLinkClick}>
            <Image src="/peka_logo.png" alt="" width={427} height={429} className="h-8 w-auto" />
          </Link>
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div
            className="label-mono mb-4 px-3 pt-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Menu
          </div>
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: isActive ? 'var(--accent-pale)' : 'transparent',
                  color: isActive ? 'var(--ink-deep)' : 'var(--text-secondary)',
                  outlineColor: 'var(--text-primary)',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--canvas-soft)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon
                  className={cn(
                    'w-4 h-4',
                    isActive ? 'text-[var(--ink-deep)]' : 'text-[var(--text-muted)]'
                  )}
                  aria-hidden={true}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div
          className="p-4"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
            <div className="flex items-center gap-3 px-3 py-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-sans"
                style={{
                  backgroundColor: 'var(--canvas-soft)',
                  color: 'var(--text-primary)',
                }}
              >
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="text-sm font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                  title={userName}
                >
                  {userName}
                </span>
                <span
                  className="text-xs truncate"
                  style={{ color: 'var(--text-muted)' }}
                  title={userEmail}
                >
                  {userEmail || "Brand workspace"}
                </span>
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="w-full mt-1 px-3 py-2 text-sm font-semibold text-left rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: 'var(--text-secondary)', outlineColor: 'var(--text-primary)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--canvas-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                Sign out
              </button>
            </form>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}