import { useEffect, useRef, useState } from 'react';
import { registrarDialogoSalir } from '../navegacion';

/**
 * Cartel «¿Salir sin guardar?» dentro de la app (reemplaza al aviso de Windows).
 * Va una sola vez, en la raíz; los formularios lo abren con `salirSiSePuede`.
 */
export default function DialogoSalir() {
  const [pendiente, setPendiente] = useState<(() => void) | null>(null);
  const quedarse = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    registrarDialogoSalir(accion => setPendiente(() => accion));
    return () => registrarDialogoSalir(null);
  }, []);

  useEffect(() => {
    if (!pendiente) return;
    quedarse.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setPendiente(null); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [pendiente]);

  if (!pendiente) return null;

  const salir = () => {
    const accion = pendiente;
    setPendiente(null);
    accion();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#14202B]/40 flex items-center justify-center p-6"
      role="dialog" aria-modal="true" aria-label="Salir sin guardar" onMouseDown={e => e.target === e.currentTarget && setPendiente(null)}>
      <div className="w-full max-w-[440px] bg-white rounded-lg border border-[#D4D4D4] shadow-[0_12px_48px_rgba(20,32,43,0.24)] overflow-hidden">
        <div className="px-6 pt-6 pb-5">
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-[#1A1C1E]">¿Salir sin guardar?</p>
            <p className="text-[13px] text-[#66686A] mt-1 leading-snug">
              Tenés cambios sin guardar en este formulario. Si salís ahora, se van a perder.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[#F8F9FA] border-t border-[#E5E7EB]">
          <button ref={quedarse} type="button" onClick={() => setPendiente(null)}
            className="flex items-center justify-center h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6]">
            Seguir editando
          </button>
          <button type="button" onClick={salir}
            className="flex items-center justify-center h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-[#DC2626] text-white hover:bg-[#B91C1C]">
            Salir sin guardar
          </button>
        </div>
      </div>
    </div>
  );
}
