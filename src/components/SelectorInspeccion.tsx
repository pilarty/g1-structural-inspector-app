import { useEffect, useRef, useState } from 'react';
import { Bot, CalendarDays, Check, ChevronDown, ScanSearch } from 'lucide-react';
import type { HistorialEntry } from '../data';
import { horaLocal } from '../formato';

/** Desplegable para elegir una de las inspecciones de la edificación (en la planta elegida). */
export default function SelectorInspeccion({ inspecciones, elegida, ultimaId, onElegir }: {
  inspecciones: HistorialEntry[];
  elegida?: number;
  /** La más reciente de la edificación */
  ultimaId?: number;
  onElegir: (id: number) => void;
}) {
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

  const actual = inspecciones.find(h => h.id === elegida) ?? inspecciones[0];
  const hallazgos = (n: number) => `${n} hallazgo${n === 1 ? '' : 's'}`;

  return (
    <div ref={caja} className="relative flex-none">
      <button type="button" onClick={() => setAbierto(x => !x)} aria-expanded={abierto} aria-haspopup="listbox"
        className={`flex items-center gap-2.5 h-9 pl-2.5 pr-2 rounded-[3px] bg-white border text-left transition-colors ${
          abierto ? 'border-[#377DC0] outline outline-1 outline-[#377DC0]' : 'border-[#D4D4D4] hover:border-[#A0A2A4]'
        }`}>
        <CalendarDays className="w-4 h-4 text-[#377DC0] flex-none" />
        {actual ? (
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="text-[13px] font-semibold text-[#1A1C1E] tabular-nums">{actual.date} · {horaLocal(actual.inicio)}</span>
            <span className="hidden xl:inline text-[12px] text-[#8A8C8E] truncate">{actual.robot} · {hallazgos(actual.detections)}</span>
          </span>
        ) : <span className="text-[13px] text-[#8A8C8E]">Sin inspecciones</span>}
        {actual?.id === ultimaId
          ? <span className="flex-none h-5 px-1.5 rounded-[3px] bg-[#E3EEF8] text-[#1E4E7C] text-[11px] font-semibold flex items-center">Última</span>
          : <span className="flex-none h-5 px-1.5 rounded-[3px] bg-[#FFFBEB] text-[#92400E] text-[11px] font-semibold flex items-center">Anterior</span>}
        <ChevronDown className={`w-4 h-4 text-[#616161] flex-none transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div role="listbox" className="absolute left-0 right-0 top-full mt-1 max-h-[320px] overflow-y-auto bg-white rounded-md border border-[#D4D4D4] shadow-[0_8px_24px_rgba(20,32,43,0.16)] py-1 z-40">
          <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A8C8E]">
            {inspecciones.length} inspecci{inspecciones.length === 1 ? 'ón' : 'ones'} en esta planta
          </p>
          {inspecciones.map(h => {
            const activa = h.id === actual?.id;
            return (
              <button key={h.id} type="button" role="option" aria-selected={activa}
                onClick={() => { if (h.id !== undefined) onElegir(h.id); setAbierto(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${activa ? 'bg-[#EEF4FB]' : 'hover:bg-[#F3F4F6]'}`}>
                <span className="w-4 flex-none">{activa && <Check className="w-4 h-4 text-[#377DC0]" />}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#1A1C1E] tabular-nums">{h.date} · {horaLocal(h.inicio)}</span>
                    {h.id === ultimaId && <span className="h-[18px] px-1.5 rounded-[3px] bg-[#E3EEF8] text-[#1E4E7C] text-[10px] font-semibold flex items-center">Última</span>}
                    {h.estado === 'en_curso' && <span className="h-[18px] px-1.5 rounded-[3px] bg-[#ECFDF5] text-[#047857] text-[10px] font-semibold flex items-center">En curso</span>}
                  </span>
                  <span className="flex items-center gap-3 mt-0.5 text-[12px] text-[#8A8C8E]">
                    <span className="flex items-center gap-1"><Bot className="w-3.5 h-3.5" />{h.robot}</span>
                    <span className="flex items-center gap-1"><ScanSearch className="w-3.5 h-3.5" />{hallazgos(h.detections)}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
