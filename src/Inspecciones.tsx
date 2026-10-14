import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Bot, Building2, ChevronDown, ChevronRight, ClipboardList, Download, Plus, Radio, Search, X,
} from 'lucide-react';
import { useProyectos } from './proyectos';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav } from './components';
import { severity } from './tokens';
import type { SeverityLevel } from './data';

interface InspeccionesProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  /** Abrir una inspección en el plano de su edificio */
  onVer: (edificioId: string, relevamientoId: number) => void;
}

type FiltroEstado = 'todas' | 'en_curso' | 'finalizadas';

const NIVELES: SeverityLevel[] = ['critical', 'high', 'medium', 'low'];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
};
const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
function duracion(inicio?: string | null, fin?: string | null) {
  if (!inicio || !fin) return '—';
  const min = Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
  if (min < 1) return '< 1 min';
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}
const codigo = (id: number) => `INS-${String(id).padStart(4, '0')}`;

/** Todas las inspecciones de todos los edificios, con filtros. */
export default function Inspecciones({ activeTab, onTabChange, onVer }: InspeccionesProps) {
  const { proyectos, cargando, error, recargar } = useProyectos();
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<FiltroEstado>('todas');
  const [robot, setRobot] = useState('todos');
  const [severidad, setSeveridad] = useState('todos');

  useEffect(() => { recargar(); }, [recargar]);

  const todas = useMemo(() => proyectos.flatMap(p => p.buildings.flatMap(b => b.historial
    .filter(h => h.id !== undefined)
    .map(h => ({ ...h, id: h.id as number, edificioId: b.id, edificio: b.name, proyecto: p.name }))))
    .sort((a, b) => (b.inicio ?? '').localeCompare(a.inicio ?? '')), [proyectos]);

  const robots = [...new Set(todas.map(i => i.robot).filter(r => r && r !== '—'))].sort();
  const q = texto.trim().toLowerCase();
  const base = todas.filter(i =>
    (!q || i.edificio.toLowerCase().includes(q) || i.proyecto.toLowerCase().includes(q) || codigo(i.id).toLowerCase().includes(q)) &&
    (robot === 'todos' || i.robot === robot) &&
    (severidad === 'todos' || (i.detections > 0 && i.severity === severidad)));
  const deEstado = (v: FiltroEstado, e?: string) => v === 'todas' || (v === 'en_curso' ? e === 'en_curso' : e !== 'en_curso');
  const filtradas = base.filter(i => deEstado(estado, i.estado));
  const hayFiltros = !!q || robot !== 'todos' || severidad !== 'todos';

  const enCurso = todas.filter(i => i.estado === 'en_curso').length;
  const hallazgos = todas.reduce((n, i) => n + i.detections, 0);
  const criticas = todas.filter(i => (i.breakdown?.critical ?? 0) > 0 || (i.detections > 0 && i.severity === 'critical')).length;
  const edificios = new Set(todas.map(i => i.edificioId)).size;

  function exportar() {
    const filas = [['Código', 'Fecha', 'Hora', 'Edificación', 'Proyecto', 'Robot', 'Operador', 'Duración', 'Hallazgos', 'Severidad máxima', 'Estado']];
    for (const i of filtradas) {
      filas.push([codigo(i.id), fechaCorta(i.inicio), hora(i.inicio), i.edificio, i.proyecto, i.robot, i.operador ?? '', duracion(i.inicio, i.fin),
        String(i.detections), i.detections > 0 ? severity[i.severity].label : '', i.estado === 'en_curso' ? 'En curso' : 'Finalizada']);
    }
    const csv = '﻿' + filas.map(f => f.map(c => `"${c.replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `inspecciones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <div className="flex-1 overflow-y-auto bg-[#F3F4F6]">
          <div className="w-full max-w-[1400px] mx-auto px-8 pt-7 pb-10">

            {/* Encabezado */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-medium text-[#8A8C8E]">Operación</p>
                <h1 className="text-[24px] font-semibold text-[#0F1A24] tracking-[-0.02em] mt-0.5">Inspecciones</h1>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={exportar} disabled={filtradas.length === 0}
                  className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6] disabled:opacity-40">
                  <Download className="w-4 h-4 text-[#66686A]" /> Exportar CSV
                </button>
                <button type="button" onClick={() => onTabChange('inspeccion')}
                  className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-[#377DC0] text-white hover:bg-[#2F6CA8]">
                  <Plus className="w-4 h-4" /> Nueva inspección
                </button>
              </div>
            </div>

            {/* Indicadores */}
            <div className="mt-6 grid grid-cols-4 bg-white rounded-md border border-[#D4D4D4] divide-x divide-[#E5E7EB]">
              <Indicador Icon={ClipboardList} etiqueta="Inspecciones" valor={todas.length}
                detalle={`en ${edificios} edificaci${edificios === 1 ? 'ón' : 'ones'}`} />
              <Indicador Icon={Radio} etiqueta="En curso" valor={enCurso} detalle={enCurso ? 'Robot recorriendo ahora' : 'Ninguna activa'}
                tono={enCurso ? '#059669' : undefined} />
              <Indicador Icon={Building2} etiqueta="Hallazgos" valor={hallazgos}
                detalle={todas.length ? `${(hallazgos / todas.length).toLocaleString('es-AR', { maximumFractionDigits: 1 })} por inspección` : '—'} />
              <Indicador Icon={AlertTriangle} etiqueta="Con hallazgos críticos" valor={criticas}
                detalle={criticas ? 'Requieren revisión' : 'Sin alertas'} tono={criticas ? '#DC2626' : undefined} />
            </div>

            {/* Tabla */}
            <div className="mt-6 bg-white rounded-md border border-[#D4D4D4] overflow-hidden">
              {/* Pestañas de estado */}
              <div className="flex items-center gap-6 px-5 border-b border-[#E5E7EB]">
                {([['todas', 'Todas'], ['en_curso', 'En curso'], ['finalizadas', 'Finalizadas']] as [FiltroEstado, string][]).map(([v, et]) => {
                  const n = base.filter(i => deEstado(v, i.estado)).length;
                  const activo = estado === v;
                  return (
                    <button key={v} type="button" onClick={() => setEstado(v)}
                      className={`relative flex items-center gap-2 h-12 text-[13px] font-medium transition-colors ${activo ? 'text-[#0F1A24]' : 'text-[#8A8C8E] hover:text-[#1A1C1E]'}`}>
                      {et}
                      <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center tabular-nums ${activo ? 'bg-[#E3EEF8] text-[#377DC0]' : 'bg-[#F1F3F5] text-[#8A8C8E]'}`}>{n}</span>
                      {activo && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#377DC0] rounded-full" />}
                    </button>
                  );
                })}
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-2.5 px-5 py-3 bg-[#F8F9FA] border-b border-[#E5E7EB]">
                <div className="flex items-center gap-1.5 px-2 h-8 flex-1 min-w-[240px] max-w-[380px] rounded-[3px] bg-white border border-[#D4D4D4] focus-within:border-[#377DC0] focus-within:outline focus-within:outline-1 focus-within:outline-[#377DC0]">
                  <Search className="w-4 h-4 text-[#8A8C8E] flex-none" />
                  <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar por código, edificación o proyecto"
                    className="bg-transparent outline-none text-[13px] w-full min-w-0 placeholder:text-[#A0A2A4]" />
                </div>
                <Desplegable valor={robot} onCambio={setRobot}
                  opciones={[{ valor: 'todos', etiqueta: 'Todos los robots' }, ...robots.map(r => ({ valor: r, etiqueta: r }))]} />
                <Desplegable valor={severidad} onCambio={setSeveridad}
                  opciones={[{ valor: 'todos', etiqueta: 'Toda severidad' }, ...NIVELES.map(s => ({ valor: s, etiqueta: severity[s].label }))]} />
                {hayFiltros && (
                  <button type="button" onClick={() => { setTexto(''); setRobot('todos'); setSeveridad('todos'); }}
                    className="flex items-center gap-1 h-8 px-2 rounded-[3px] text-[13px] font-medium text-[#66686A] hover:bg-black/[0.06]">
                    <X className="w-3.5 h-3.5" /> Limpiar filtros
                  </button>
                )}
              </div>

              {cargando && todas.length === 0 ? (
                <p className="px-5 py-10 text-center text-[13px] text-[#8A8C8E]">Cargando inspecciones…</p>
              ) : error ? (
                <p className="px-5 py-10 text-center text-[13px] text-[#991B1B]">{error}</p>
              ) : filtradas.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <ClipboardList className="w-8 h-8 mx-auto text-[#C4C7CA]" />
                  <p className="mt-3 text-[14px] font-medium text-[#1A1C1E]">
                    {todas.length === 0 ? 'Todavía no hay inspecciones' : 'Sin resultados'}
                  </p>
                  <p className="mt-1 text-[13px] text-[#8A8C8E]">
                    {todas.length === 0 ? 'Cuando el robot recorra una edificación, la inspección aparece acá.' : 'Probá con otros filtros.'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A8C8E] border-b border-[#E5E7EB]">
                      <Th>Código</Th><Th>Fecha</Th><Th>Edificación</Th><Th>Robot</Th><Th>Duración</Th><Th>Hallazgos</Th><Th>Estado</Th><Th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map(i => (
                      <tr key={i.id} onClick={() => onVer(i.edificioId, i.id)}
                        className="group cursor-pointer border-b border-[#EEEFF1] last:border-0 hover:bg-[#F7FAFD] transition-colors">
                        <Td><span className="font-mono text-[12px] text-[#66686A]">{codigo(i.id)}</span></Td>
                        <Td>
                          <span className="block text-[13px] font-medium text-[#1A1C1E] tabular-nums">{fechaCorta(i.inicio)}</span>
                          <span className="block text-[12px] text-[#8A8C8E] tabular-nums">{hora(i.inicio)}</span>
                        </Td>
                        <Td className="max-w-[320px]">
                          <span className="block text-[13px] font-semibold text-[#0F1A24] truncate">{i.edificio}</span>
                          <span className="block text-[12px] text-[#8A8C8E] truncate">{i.proyecto}</span>
                        </Td>
                        <Td>
                          <span className="flex items-center gap-2 text-[13px] text-[#1A1C1E]">
                            <span className="w-6 h-6 rounded-[3px] bg-[#F1F3F5] flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-[#66686A]" /></span>
                            {i.robot}
                          </span>
                        </Td>
                        <Td><span className="text-[13px] text-[#66686A] tabular-nums">{duracion(i.inicio, i.fin)}</span></Td>
                        <Td><Hallazgos total={i.detections} desglose={i.breakdown} maxima={i.severity} /></Td>
                        <Td><Estado enCurso={i.estado === 'en_curso'} /></Td>
                        <Td className="w-10 pr-4"><ChevronRight className="w-4 h-4 text-[#C4C7CA] group-hover:text-[#377DC0] transition-colors" /></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {filtradas.length > 0 && (
                <div className="px-5 py-2.5 border-t border-[#E5E7EB] bg-[#F8F9FA] text-[12px] text-[#8A8C8E]">
                  Mostrando <b className="font-semibold text-[#1A1C1E]">{filtradas.length}</b> de {todas.length} inspecciones
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Indicador({ Icon, etiqueta, valor, detalle, tono }: {
  Icon: React.ElementType; etiqueta: string; valor: number; detalle: string; tono?: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[#66686A]">
        <Icon className="w-4 h-4 text-[#A0A2A4]" /> {etiqueta}
      </div>
      <p className="text-[28px] font-semibold tracking-[-0.02em] tabular-nums mt-1.5 leading-none" style={{ color: tono ?? '#0F1A24' }}>{valor}</p>
      <p className="text-[12px] text-[#8A8C8E] mt-2">{detalle}</p>
    </div>
  );
}

const Th = ({ children }: { children?: React.ReactNode }) => <th className="px-5 py-3 font-semibold">{children}</th>;
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) =>
  <td className={`px-5 py-3.5 align-middle whitespace-nowrap ${className}`}>{children}</td>;

/** Cantidad de hallazgos con una barrita por severidad. */
function Hallazgos({ total, desglose, maxima }: { total: number; desglose?: Record<SeverityLevel, number>; maxima: SeverityLevel }) {
  if (total === 0) return <span className="text-[12px] text-[#A0A2A4]">Sin hallazgos</span>;
  const partes = desglose && NIVELES.some(n => desglose[n] > 0) ? NIVELES.filter(n => desglose[n] > 0) : [maxima];
  const cant = (n: SeverityLevel) => (desglose && desglose[n] > 0 ? desglose[n] : total);
  return (
    <div className="flex items-center gap-2.5" title={partes.map(n => `${severity[n].label}: ${cant(n)}`).join(' · ')}>
      <span className="text-[13px] font-semibold text-[#1A1C1E] tabular-nums w-5 text-right">{total}</span>
      <span className="flex h-1.5 w-[72px] rounded-full overflow-hidden bg-[#F1F3F5]">
        {partes.map(n => (
          <span key={n} style={{ width: `${(cant(n) / total) * 100}%`, backgroundColor: severity[n].dot }} />
        ))}
      </span>
      <span className="text-[12px] font-medium" style={{ color: severity[maxima].dot }}>{severity[maxima].label}</span>
    </div>
  );
}

function Estado({ enCurso }: { enCurso: boolean }) {
  return enCurso ? (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-[3px] text-[12px] font-medium bg-[#ECFDF5] text-[#047857] ring-1 ring-inset ring-[#047857]/15">
      <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-[#10B981] animate-ping opacity-60" /><span className="relative w-1.5 h-1.5 rounded-full bg-[#10B981]" /></span>
      En curso
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-[3px] text-[12px] font-medium bg-[#F8FAFC] text-[#475569] ring-1 ring-inset ring-[#475569]/15">
      <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" /> Finalizada
    </span>
  );
}

/** Lista desplegable compacta, con el mismo borde que el buscador. */
function Desplegable({ valor, onCambio, opciones }: {
  valor: string; onCambio: (v: string) => void; opciones: { valor: string; etiqueta: string }[];
}) {
  return (
    <div className="relative w-[170px]">
      <select value={valor} onChange={e => onCambio(e.target.value)}
        className="w-full h-8 pl-2.5 pr-8 appearance-none rounded-[3px] bg-white border border-[#D4D4D4] text-[13px] text-[#1A1C1E] outline-none focus:border-[#377DC0] focus:outline focus:outline-1 focus:outline-[#377DC0] cursor-pointer">
        {opciones.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#616161] pointer-events-none" />
    </div>
  );
}
