import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#7A7670] uppercase tracking-widest">Loading STUDIO.V</p>
      </div>
    </div>
  );
}
