import { useEffect, useState } from 'react';
import { Check, CircleDashed, Download, ImageOff, Loader2, MapPin, X } from 'lucide-react';
import { infoDano } from '../danos';
import { fechaLarga, horaLocal } from '../formato';

export interface DatosDeteccion {
  id: number;
  numero: number;
  /** Clase que devolvió el clasificador (puede venir vacía) */
  tipo: string | null;
  probabilidad: number | null; // 0 a 1
  x: number | null;
  y: number | null;
  fecha: string | null;
  /** undefined: cargando · null: sin foto */
  foto: string | null | undefined;
}

export type EstadoRevision = 'pendiente' | 'confirmado' | 'descartado';
export interface Revision {
  estado: EstadoRevision;
  nota: string | null;
  /** Qué hacer con el daño y en qué plazo (lo pide la Ley 257 de CABA para los informes) */
  intervencion?: string | null;
  plazo?: string | null;
}

export const PLAZOS = ['Inmediato', 'Dentro de 30 días', 'Dentro de 6 meses', 'Dentro de 1 año', 'Controlar en la próxima inspección'];

export const ESTADOS_REVISION: { valor: EstadoRevision; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: 'Sin revisar' },
  { valor: 'confirmado', etiqueta: 'Confirmado' },
  { valor: 'descartado', etiqueta: 'Descartado (falso positivo)' },
];

/** Detalle de un hallazgo: foto, daño detectado con su confianza y dónde está. */
export default function DetalleDeteccion({ d, revision, onGuardarRevision, onCerrar }: {
  d: DatosDeteccion;
  /** Lo que ya revisó el inspector (si no, «Sin revisar») */
  revision: Revision | null;
  /** Guarda la revisión; devuelve false si no se pudo */
  onGuardarRevision: (r: Revision) => Promise<boolean>;
  onCerrar: () => void;
}) {
  const [estado, setEstado] = useState<EstadoRevision>(revision?.estado ?? 'pendiente');
  const [nota, setNota] = useState(revision?.nota ?? '');
  const [intervencion, setIntervencion] = useState(revision?.intervencion ?? '');
  const [plazo, setPlazo] = useState(revision?.plazo ?? '');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const cambio = estado !== (revision?.estado ?? 'pendiente') || nota.trim() !== (revision?.nota ?? '')
    || intervencion.trim() !== (revision?.intervencion ?? '') || plazo !== (revision?.plazo ?? '');

  async function guardar() {
    setGuardando(true);
    setAviso(null);
    const confirmado = estado === 'confirmado';
    const ok = await onGuardarRevision({
      estado, nota: nota.trim() || null,
      intervencion: confirmado ? intervencion.trim() || null : null,
      plazo: confirmado ? plazo || null : null,
    });
    setGuardando(false);
    setAviso(ok ? { ok: true, texto: 'Revisión guardada.' } : { ok: false, texto: 'No se pudo guardar. Revisá tu conexión.' });
  }

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  const tipo = infoDano(d.tipo);
  const color = tipo.color;
  const pct = d.probabilidad != null ? Math.round(d.probabilidad * 100) : null;

  return (
    <div className="fixed inset-0 z-50 bg-[#14202B]/10 flex items-center justify-center p-6" onMouseDown={e => e.target === e.currentTarget && onCerrar()}
      role="dialog" aria-modal="true" aria-label={`Hallazgo ${d.numero}`}>
      <div className="w-full max-w-[820px] bg-white rounded-lg border border-[#D4D4D4] shadow-[0_12px_48px_rgba(20,32,43,0.24)] overflow-hidden flex">
        {/* Foto */}
        <div className="relative flex-none w-[380px] min-h-[340px] bg-[#EEF1F4]">
          {d.foto ? (
            <img src={d.foto} alt={`Foto del hallazgo ${d.numero}`} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[12px] text-[#8A8C8E]">
              {d.foto === undefined ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageOff className="w-5 h-5" />}
              {d.foto === undefined ? 'Cargando foto…' : 'Sin foto'}
            </div>
          )}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 h-7 px-2.5 rounded-[4px] bg-white/95 border border-[#E5E7EB] text-[12px] font-semibold text-[#1A1C1E]">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {tipo.etiqueta}
          </div>
        </div>

        {/* Datos */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-[#E5E7EB]">
            <span className="flex-none w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white tabular-nums" style={{ background: color }}>
              {d.numero}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-bold text-[#1A1C1E] leading-tight truncate">Hallazgo #{d.numero}</h2>
              <p className="text-[13px] text-[#8A8C8E] mt-0.5">
                {d.fecha ? `${fechaLarga(d.fecha)}, ${horaLocal(d.fecha)}` : 'Sin fecha'}
              </p>
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar"
              className="flex-none w-8 h-8 -mr-1.5 flex items-center justify-center rounded-[4px] text-[#616161] hover:bg-black/[0.06]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
            <section>
              <h3 className="text-[12px] font-semibold text-[#616161] mb-2">Daño detectado</h3>
              <div className="rounded-md border border-[#E5E7EB] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1C1E] truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: color }} />{tipo.etiqueta}
                  </span>
                  {pct !== null && <span className="text-[13px] font-semibold text-[#377DC0] tabular-nums">{pct}%</span>}
                </div>
                {pct !== null && (
                  <>
                    <div className="mt-2.5 h-1.5 rounded-full bg-[#EEF1F4] overflow-hidden">
                      <div className="h-full rounded-full bg-[#377DC0]" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[11px] text-[#8A8C8E] mt-1.5">Confianza del modelo</p>
                  </>
                )}
              </div>
            </section>

            <p className="flex items-center gap-1.5 text-[13px] text-[#66686A] tabular-nums">
              <MapPin className="w-3.5 h-3.5 text-[#8A8C8E]" />
              Ubicación en el plano: <b className="font-semibold text-[#1A1C1E]">{d.x != null && d.y != null ? `X ${d.x.toFixed(1)} m · Y ${d.y.toFixed(1)} m` : '—'}</b>
            </p>

            {/* Revisión del inspector: la IA propone, el ingeniero valida */}
            <section>
              <h3 className="text-[12px] font-semibold text-[#616161] mb-2">Revisión del inspector</h3>
              <div className="grid grid-cols-3 rounded-[3px] border border-[#D4D4D4] overflow-hidden">
                {ESTADOS_REVISION.map(e => {
                  const activo = estado === e.valor;
                  const tono = e.valor === 'confirmado' ? 'bg-[#047857]' : e.valor === 'descartado' ? 'bg-[#66686A]' : 'bg-[#377DC0]';
                  return (
                    <button key={e.valor} type="button" onClick={() => { setEstado(e.valor); setAviso(null); }} aria-pressed={activo}
                      className={`flex items-center justify-center gap-1.5 h-9 px-2 text-[12px] font-medium border-r last:border-r-0 border-[#D4D4D4] transition-colors ${
                        activo ? `${tono} text-white` : 'bg-white text-[#1A1C1E] hover:bg-[#F3F4F6]'
                      }`}>
                      {e.valor === 'confirmado' ? <Check className="w-3.5 h-3.5" /> : e.valor === 'descartado' ? <X className="w-3.5 h-3.5" /> : <CircleDashed className="w-3.5 h-3.5" />}
                      <span className="truncate">{e.valor === 'descartado' ? 'Descartado' : e.etiqueta}</span>
                    </button>
                  );
                })}
              </div>
              {estado === 'descartado' && <p className="text-[11px] text-[#8A8C8E] mt-1.5">Falso positivo: no se cuenta como daño ni sale en el informe.</p>}
              {estado === 'confirmado' && (
                <div className="grid grid-cols-[1fr_190px] gap-2.5 mt-2.5">
                  <label className="block">
                    <span className="text-[12px] text-[#616161]">Intervención recomendada</span>
                    <input value={intervencion} onChange={e => { setIntervencion(e.target.value); setAviso(null); }}
                      placeholder="Ej. sellado de fisura con epoxi, picado y reparación…"
                      className="mt-1 w-full h-9 px-3 rounded-md text-[13px] text-[#1A1C1E] bg-white border border-[#D4D4D4] outline-none focus:border-[#377DC0] placeholder:text-[#A0A2A4]" />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-[#616161]">Plazo</span>
                    <select value={plazo} onChange={e => { setPlazo(e.target.value); setAviso(null); }}
                      className="mt-1 w-full h-9 px-2 rounded-md text-[13px] text-[#1A1C1E] bg-white border border-[#D4D4D4] outline-none focus:border-[#377DC0]">
                      <option value="">Sin definir</option>
                      {PLAZOS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                </div>
              )}
              <textarea value={nota} onChange={e => { setNota(e.target.value); setAviso(null); }} rows={2}
                placeholder="Nota"
                className="mt-2.5 w-full px-3 py-2 rounded-md text-[13px] text-[#1A1C1E] bg-white border border-[#D4D4D4] outline-none focus:border-[#377DC0] focus:outline focus:outline-1 focus:outline-[#377DC0] placeholder:text-[#A0A2A4] resize-none" />
              <div className="flex items-center justify-end gap-3 mt-2">
                {aviso && <span className={`text-[12px] ${aviso.ok ? 'text-[#047857]' : 'text-[#991B1B]'}`}>{aviso.texto}</span>}
                <button type="button" onClick={guardar} disabled={!cambio || guardando}
                  className="flex items-center justify-center gap-2 h-8 px-3 rounded-[3px] text-[13px] font-medium transition-colors bg-[#377DC0] text-white hover:bg-[#2F6CA8] disabled:bg-[#E5E7EB] disabled:text-[#A0A2A4]">
                  {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar revisión
                </button>
              </div>
            </section>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[#F8F9FA] border-t border-[#E5E7EB]">
            <button type="button" onClick={onCerrar}
              className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6]">
              Ver en el plano
            </button>
            {d.foto ? (
              <a href={d.foto} download={`hallazgo-${d.numero}.png`} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-[#377DC0] text-white hover:bg-[#2F6CA8]">
                <Download className="w-4 h-4" /> Descargar imagen
              </a>
            ) : (
              <span className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium bg-[#E5E7EB] text-[#A0A2A4] cursor-not-allowed">
                <Download className="w-4 h-4" /> Descargar imagen
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
