import React from 'react';

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Ícono a la izquierda del texto */
  icon?: React.ReactNode;
  /** Ícono a la derecha del texto */
  iconRight?: React.ReactNode;
  /** Tamaño: normal, grande o de todo el ancho */
  variant?: 'default' | 'large' | 'full';
  /** Ya no se usa (los botones no llevan sombra) */
  shadow?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

const sizeClasses: Record<NonNullable<PrimaryButtonProps['variant']>, string> = {
  default: 'h-9 px-3.5 text-[13px]',
  large:   'h-10 px-4 text-[14px]',
  full:    'w-full h-10 text-[14px]',
};

export default function PrimaryButton({
  children,
  onClick,
  disabled,
  icon,
  iconRight,
  variant = 'default',
  type = 'button',
  className = '',
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex items-center justify-center gap-2 font-medium rounded-[3px] transition-colors',
        sizeClasses[variant],
        disabled
          ? 'bg-[#E5E7EB] text-[#A0A2A4] cursor-not-allowed'
          : 'bg-[#377DC0] text-white hover:bg-[#2F6CA8]',
        
        className,
      ].join(' ')}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
