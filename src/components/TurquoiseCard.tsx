import React from 'react';

interface TurquoiseCardProps {
  children: React.ReactNode;
  className?: string;
  /** 'overlay' — flat, square corners, no blur (map overlay panels, Relevamiento) | 'md' — rounded-xl | 'lg' — rounded-2xl (form/setup cards) */
  size?: 'overlay' | 'md' | 'lg';
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
        size === 'overlay' ? 'bg-[#E4E8E4]/90' : 'bg-[#377DC0]/[0.07] backdrop-blur-md',
        'overflow-hidden',
        size === 'lg' ? 'rounded-2xl' : size === 'md' ? 'rounded-xl' : '',
        bordered ? 'border border-[#377DC0]/20' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
