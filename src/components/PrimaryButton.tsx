import React from 'react';

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Icon rendered to the left of the label */
  icon?: React.ReactNode;
  /** 'default' — inline px-6 py-2.5 | 'large' — px-7 py-3 | 'full' — w-full py-3.5 */
  variant?: 'default' | 'large' | 'full';
  /** Add brand drop-shadow */
  shadow?: boolean;
  type?: 'button' | 'submit';
}

const sizeClasses: Record<NonNullable<PrimaryButtonProps['variant']>, string> = {
  default: 'px-6 py-2.5 text-[13px]',
  large:   'px-7 py-3 text-[14px]',
  full:    'w-full py-3.5 text-[14px]',
};

export default function PrimaryButton({
  children,
  onClick,
  disabled,
  icon,
  variant = 'default',
  shadow = false,
  type = 'button',
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors',
        sizeClasses[variant],
        disabled
          ? 'bg-[#E2DFD8] text-[#A0A2A4] cursor-not-allowed'
          : 'bg-[#11676A] text-white hover:bg-[#0E5254]',
        shadow && !disabled ? 'shadow-[0_2px_12px_rgba(17,103,106,0.30)]' : '',
      ].join(' ')}
    >
      {icon}
      {children}
    </button>
  );
}
