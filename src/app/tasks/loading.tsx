import React from 'react';

export default function TasksLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-[var(--color-text-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-sans text-[var(--color-text-muted)] uppercase tracking-widest">Loading Tasks...</p>
      </div>
    </div>
  );
}
