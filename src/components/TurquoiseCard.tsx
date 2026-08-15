import React from 'react';

interface TurquoiseCardProps {
  children: React.ReactNode;
  className?: string;
  /** 'md' — rounded-xl (FloorPlan overlay panels) | 'lg' — rounded-2xl (form/setup cards) */
  size?: 'md' | 'lg';
  /** Add 1px teal border (used on form-style cards in NewBuilding, Setup) */
  bordered?: boolean;
}

export default function TurquoiseCard({
  children,
  className = '',
  size = 'lg',
  bordered = false,
}: TurquoiseCardProps) {
  return (
    <div
      className={[
        'bg-[#11676A]/[0.07] backdrop-blur-md overflow-hidden',
        size === 'lg' ? 'rounded-2xl' : 'rounded-xl',
        bordered ? 'border border-[#11676A]/20' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
