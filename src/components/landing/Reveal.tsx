"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

// Shared scroll-reveal vehicle for the landing. Transform/opacity only
// (compositor-friendly, 60fps). Content is always rendered — motion only
// enhances. With prefers-reduced-motion (or no JS) the plain static tree
// is returned, so nothing is ever gated behind animation.
export const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

interface RevealProps {
  children: React.ReactNode;
  /** stagger offset in seconds */
  delay?: number;
  /** rise distance in px */
  y?: number;
  className?: string;
  style?: React.CSSProperties;
  /** element to render — "li" keeps list semantics when revealing list entries (the li must be a direct child of its ol/ul) */
  as?: "div" | "li";
}

export default function Reveal({ children, delay = 0, y = 28, className, style, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    if (as === "li") {
      return (
        <li className={className} style={style}>
          {children}
        </li>
      );
    }
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  const MotionTag = as === "li" ? motion.li : motion.div;
  return (
    <MotionTag
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}
