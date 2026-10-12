import React from 'react';

// ─── Panel typography ───────────────────────────────────────────────────────
// One consistent style each for title / field label / body text, used inside
// TurquoiseCard sections across every screen (originated in Relevamiento).

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return <span className="text-[14px] font-bold text-[#1A1C1E]">{children}</span>;
}

export function PanelLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[11px] font-medium text-[#14202B] ${className}`}>{children}</p>;
}

export function PanelText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[12px] font-normal text-[#1A1C1E] ${className}`}>{children}</p>;
}
