import React, { useEffect, useRef, useState } from 'react';
import { User, LogOut, Settings } from 'lucide-react';
import { useSesion } from '../sesion';

interface TopNavProps {
  /** Algo para mostrar arriba de la pantalla (por ejemplo, un aviso). Sin esto, no se dibuja nada. */
  badge?: React.ReactNode;
}

/**
 * Antes era la barra de arriba (parada de emergencia y usuario). Ahora los dos están en la barra
 * de la izquierda, así que solo aparece si una pantalla le pasa algo para mostrar.
 */
export default function TopNav({ badge }: TopNavProps) {
  if (!badge) return null;
  return (
    <nav className="flex-none h-10 bg-[#14202B] flex items-center px-6 z-20 border-b border-white/5">
      {badge}
    </nav>
  );
}

/** Botón de perfil de la barra izquierda: muestra el usuario y «Cerrar sesión». */
export function MenuUsuario() {
  const { usuario, cerrar } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  return (
    <div ref={caja} className="relative w-full">
      <button type="button" onClick={() => setAbierto(x => !x)} aria-expanded={abierto} aria-label="Perfil"
        className={`group relative w-full flex items-center justify-center h-14 transition-colors ${abierto ? 'text-white' : 'text-white/35 hover:text-white/70'}`}>
        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${abierto ? 'bg-white/25' : 'bg-white/10 group-hover:bg-white/15'}`}>
          <User size={20} />
        </span>
        {!abierto && (
          <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1A1C1E] text-white text-[13px] font-medium px-3 py-2 rounded-lg shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-40">
            Perfil
          </span>
        )}
      </button>
      {abierto && (
        <div className="absolute left-full bottom-1 ml-2 w-[240px] bg-white rounded-lg shadow-[0_8px_32px_rgba(20,32,43,0.22)] border border-[#D4D4D4] overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[#E5E7EB]">
            <p className="text-[11px] text-[#8A8C8E]">Sesión iniciada como</p>
            <p className="text-[13px] font-semibold text-[#1A1C1E] truncate">{usuario}</p>
          </div>
          <button type="button" disabled title="Próximamente"
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-[#A0A2A4] cursor-not-allowed">
            <Settings className="w-4 h-4" /> Configuración
          </button>
          <button type="button" onClick={() => { setAbierto(false); cerrar(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
