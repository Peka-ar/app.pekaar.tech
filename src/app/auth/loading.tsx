import React from 'react';

export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[var(--color-text-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">Loading STUDIO.V</p>
      </div>
    </div>
  );
}
