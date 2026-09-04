import React from "react";

const CATEGORIES = ["furniture", "jewelry", "apparel", "decor"] as const;

export default function CategoryStrip() {
  return (
    <section
      aria-label="Built for"
      className="relative overflow-hidden"
      style={{
        background: "var(--canvas)",
        borderTop: "1px solid var(--border-default)",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
        <span className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--text-muted)] shrink-0">
          Built for
        </span>

        {/* Desktop: inline list */}
        <div className="hidden sm:flex items-center gap-4">
          {CATEGORIES.map((cat, i) => (
            <React.Fragment key={cat}>
              <span className="font-display font-semibold text-[18px] sm:text-[20px] tracking-[-0.01em] text-[var(--text-primary)] capitalize">
                {cat}
              </span>
              {i < CATEGORIES.length - 1 && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] ml-1">storefronts</span>
        </div>

        {/* Mobile: marquee */}
        <div className="sm:hidden relative w-full overflow-hidden">
          <div className="flex w-max animate-[marquee_22s_linear_infinite] items-center gap-4">
            {[...CATEGORIES, ...CATEGORIES].map((cat, i) => (
              <React.Fragment key={`${cat}-${i}`}>
                <span
                  aria-hidden={i >= CATEGORIES.length}
                  className="font-display font-semibold text-[16px] tracking-[-0.01em] text-[var(--text-primary)] capitalize whitespace-nowrap"
                >
                  {cat}
                </span>
                <span className="w-1 h-1 rounded-full shrink-0 bg-[var(--accent)]" aria-hidden="true" />
              </React.Fragment>
            ))}
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] whitespace-nowrap">storefronts</span>
            <span className="w-1 h-1 rounded-full shrink-0 bg-[var(--accent)]" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
