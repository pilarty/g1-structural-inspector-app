import React from 'react';

// ─── Summary variant (InspectionRecorrido stats row) ─────────────────────────
interface SummaryStatProps {
  variant: 'summary';
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  iconColor?: string;
  divider?: boolean;
}

// ─── Live variant (InspectionLive stats row) ──────────────────────────────────
interface LiveStatProps {
  variant: 'live';
  label: string;
  value: string;
  sub: string;
  valueColor: string;
  /** Renders a colored dot before the value (used for "Conectado") */
  dot?: boolean;
  divider?: boolean;
}

type StatBlockProps = SummaryStatProps | LiveStatProps;

export default function StatBlock(props: StatBlockProps) {
  const dividerClass = props.divider ? 'border-r border-[#F0EDE8]' : '';

  if (props.variant === 'summary') {
    const { icon, label, value, valueColor = '#1A1C1E', iconColor = '#377DC0' } = props;
    return (
      <div className={`flex-1 flex items-center gap-3 px-3 ${dividerClass}`}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
          style={{ backgroundColor: 'rgba(55,125,192,0.07)' }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
        <div>
          <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest mb-0.5">{label}</p>
          <p className="text-[13px] font-semibold leading-tight" style={{ color: valueColor }}>{value}</p>
        </div>
      </div>
    );
  }

  // live
  const { label, value, sub, valueColor, dot } = props;
  return (
    <div className={`flex-1 px-5 py-1 ${dividerClass}`}>
      <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {dot && (
          <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: valueColor }} />
        )}
        <span
          className="text-[20px] font-bold leading-none tracking-tight tabular-nums"
          style={{ color: valueColor }}
        >
          {value}
        </span>
      </div>
      <p className="text-[10px] text-[#A0A2A4] mt-0.5">{sub}</p>
    </div>
  );
}
