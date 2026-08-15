import React from 'react';
import { severity } from '../tokens';
import type { SeverityLevel } from '../data';

interface SeverityBadgeProps {
  level: SeverityLevel;
  /** Optional count appended after the label, e.g. "Crítica 2" */
  count?: number;
}

export default function SeverityBadge({ level, count }: SeverityBadgeProps) {
  const { dot, bg, label } = severity[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
      style={{ color: dot, backgroundColor: bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: dot }} />
      {label}{count !== undefined ? ` ${count}` : ''}
    </span>
  );
}
