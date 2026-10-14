import React, { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

/** Confirmación para acciones que no se pueden deshacer (eliminar). */
export default function DialogoConfirmar({ titulo, children, error, enviando, textoBoton = 'Eliminar', escribir, onConfirmar, onCerrar }: {
  titulo: string;
  /** Si viene, hay que escribir este texto para habilitar el botón (confirmación fuerte) */
  escribir?: string;
  children: React.ReactNode;
  error: string | null;
  enviando: boolean;
  textoBoton?: string;
  onConfirmar: () => void;
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState('');
  const coincide = !escribir || texto.trim().toLowerCase() === escribir.trim().toLowerCase();
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.16)] overflow-hidden">
        <div className="px-6 pt-6 pb-5 flex items-start gap-4">
          <span className="flex-none w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#991B1B] flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-[#1A1C1E]">{titulo}</p>
            <div className="text-[13px] text-[#66686A] mt-1 leading-snug">{children}</div>
            {escribir && (
              <label className="block mt-4">
                <span className="text-[13px] text-[#1A1C1E]">Para confirmar, escribí <b>{escribir}</b>:</span>
                <input
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  autoFocus
                  spellCheck={false}
                  className="mt-1.5 w-full px-3 h-[40px] rounded-xl text-[13px] font-semibold text-[#1A1C1E] bg-[#F8FAFC] border border-[#EF4444]/40 focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/15 outline-none"
                />
              </label>
            )}
            {error && <p className="text-[13px] font-medium text-[#991B1B] mt-3 leading-snug">{error}</p>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 px-6 py-4 bg-[#F8FAFC] border-t border-[#14202B]/[0.06]">
          <button type="button" onClick={onCerrar} disabled={enviando} className="text-[13px] font-medium text-[#8A8C8E] hover:text-[#1A1C1E]">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} disabled={enviando || !coincide}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors disabled:opacity-50">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {enviando ? 'Eliminando…' : textoBoton}
          </button>
        </div>
      </div>
    </div>
  );
}
