import React, { useEffect, useRef, useState } from 'react';
import { User, ChevronDown, LogOut } from 'lucide-react';
import { useSesion } from '../sesion';
import ParadaEmergencia from './ParadaEmergencia';

interface TopNavProps {
  /**
   * Optional element rendered after the app title — e.g. a status badge or
   * building name chip. Pass null/undefined to render the title alone.
   */
  badge?: React.ReactNode;
}

/**
 * App-wide top navigation bar. Fixed at h-12, navy background (matches ActivityBar),
 * shows app title + optional badge on the left and notification + user avatar on the right.
 */
export default function TopNav({ badge }: TopNavProps) {
  const { usuario, cerrar } = useSesion();
  return (
    <nav className="flex-none h-14 bg-[#14202B] flex items-center justify-between px-6 z-20 border-b border-white/5">
      {/* Left — optional badge */}
      <div className="flex items-center min-w-0">
        {badge}
      </div>

      {/* Right — parada de emergencia + usuario */}
      <div className="flex items-center gap-1 flex-none">
        <div className="mr-3">
          <ParadaEmergencia />
        </div>
        <MenuUsuario usuario={usuario} onCerrar={cerrar} />
      </div>
    </nav>
  );
}

/** Nombre del usuario: al tocarlo se abre un menú con «Cerrar sesión». */
function MenuUsuario({ usuario, onCerrar }: { usuario: string | null; onCerrar: () => void }) {
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
    <div ref={caja} className="relative ml-1">
      <button type="button" onClick={() => setAbierto(x => !x)} aria-expanded={abierto}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors ${abierto ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <span className="text-[14px] font-medium max-w-[220px] truncate">{usuario}</span>
        <ChevronDown className={`w-4 h-4 opacity-55 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-[200px] bg-white rounded-xl shadow-[0_8px_32px_rgba(20,32,43,0.18)] border border-[#14202B]/[0.07] py-1.5 z-50">
          <button type="button" onClick={() => { setAbierto(false); onCerrar(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-semibold text-[#991B1B] hover:bg-[#FEF2F2] transition-colors">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
