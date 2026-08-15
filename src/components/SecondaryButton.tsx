import React from 'react';

interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  /** 'ghost' — text-only link | 'outline' — bordered white bg */
  variant?: 'ghost' | 'outline';
}

export default function SecondaryButton({
  children,
  onClick,
  icon,
  variant = 'ghost',
}: SecondaryButtonProps) {
  const base = 'flex items-center gap-2 transition-colors font-medium text-[13px]';

  if (variant === 'outline') {
    return (
      <button
        onClick={onClick}
        className={`${base} px-5 py-2.5 bg-white text-[#1A1C1E] rounded-xl hover:bg-[#F3F1ED] shadow-[0_1px_4px_rgba(0,0,0,0.06)]`}
      >
        {icon}
        {children}
      </button>
    );
  }

  // ghost
  return (
    <button
      onClick={onClick}
      className={`${base} text-[#8A8C8E] hover:text-[#1A1C1E]`}
    >
      {icon}
      {children}
    </button>
  );
}
