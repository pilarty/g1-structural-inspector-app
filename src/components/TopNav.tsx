import React, { useState } from 'react';
import { User } from 'lucide-react';
import VentanaPerfil from './VentanaPerfil';

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

/** Botón de perfil de la barra izquierda: abre la ventana de perfil y configuración. */
export function MenuUsuario() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="relative w-full">
      <button type="button" onClick={() => setAbierto(true)} aria-label="Perfil"
        className={`group relative w-full flex items-center justify-center h-14 transition-colors ${abierto ? 'text-white' : 'text-white/35 hover:text-white/70'}`}>
        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${abierto ? 'bg-white/25' : 'bg-white/10 group-hover:bg-white/15'}`}>
          <User size={20} />
        </span>
        <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1A1C1E] text-white text-[13px] font-medium px-3 py-2 rounded-lg shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-40">
          Perfil
        </span>
      </button>
      {abierto && <VentanaPerfil onCerrar={() => setAbierto(false)} />}
    </div>
  );
}
