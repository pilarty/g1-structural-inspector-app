import React from 'react';

interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  /** Se mantiene por compatibilidad: los dos se ven como botón blanco con borde */
  variant?: 'ghost' | 'outline';
}

/** Botón secundario: blanco con borde gris (como «Exportar CSV»). */
export default function SecondaryButton({ children, onClick, icon }: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6]"
    >
      {icon}
      {children}
    </button>
  );
}
