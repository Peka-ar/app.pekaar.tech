"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/components/ui/cn";

const EXIT_MS = 360;
const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface TaskDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Right slide-over sheet (full-bleed below `sm`). Sage ground with white
 * grouped sections inside (iOS grouped-list). Enters from the right and
 * exits along the same path (spatial consistency) — unmount is deferred
 * by EXIT_MS so the slide-out can play. Focus contract: close button
 * focused on open, Esc + Tab trap while mounted, trigger focus + body
 * scroll restored on unmount.
 */
export function TaskDrawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  footer,
  children,
}: TaskDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const [portalNode] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    return document.createElement("div");
  });
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!portalNode) return;
    document.body.appendChild(portalNode);
    return () => {
      portalNode.remove();
    };
  }, [portalNode]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Mount on open; unmount is deferred by the exit choreography below.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
    }
  }, [open]);

  // Entrance / exit — slide in from the right, slide back out the same path.
  useEffect(() => {
    if (!mounted) return;
    if (open) {
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(raf);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  // Scroll lock + focus management for as long as the drawer is on screen.
  useEffect(() => {
    if (!mounted) return;
    previouslyFocused.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [mounted]);

  if (!portalNode || !mounted) return null;

  return createPortal(
    <div
      role="presentation"
      className={cn("fixed inset-0 z-50", !visible && "pointer-events-none")}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out",
          visible ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col bg-[var(--color-canvas-soft)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-2)] will-change-transform sm:m-4 sm:h-[calc(100%-32px)] sm:max-w-[640px] sm:rounded-[24px] sm:pb-0",
          "transition-transform duration-[360ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          visible ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            {badge && <div className="mb-1.5">{badge}</div>}
            <h2
              className="truncate text-lg font-semibold tracking-tight text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{subtitle}</p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-canvas)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] active:scale-[0.96]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="drawer-content min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-[var(--color-border-default)] bg-[var(--color-canvas-soft)] px-5 pb-[calc(1rem_+_env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    portalNode
  );
}
