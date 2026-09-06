import React from 'react';

export default function TasksLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas-soft)] flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-[var(--color-text-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="label-mono text-[var(--color-text-muted)]">Loading Tasks…</p>
      </div>
    </div>
  );
}
