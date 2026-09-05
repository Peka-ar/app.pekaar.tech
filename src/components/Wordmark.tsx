import React from "react";

type WordmarkProps = {
  className?: string;
  dotClassName?: string;
  as?: "span" | "p" | "div" | "h1";
};

/**
 * Peka AR wordmark — text logo per design.md §8.4.
 * Figtree 900 display face (applied by callers) + Peka Green dot.
 * Single source of truth for the brand mark.
 * file: src/components/Wordmark.tsx
 */
export function Wordmark({ className, dotClassName, as: Tag = "span" }: WordmarkProps) {
  return (
    <Tag className={className}>
      Peka AR<span className={dotClassName ?? "text-[var(--color-accent)]"}>.</span>
    </Tag>
  );
}

export default Wordmark;
