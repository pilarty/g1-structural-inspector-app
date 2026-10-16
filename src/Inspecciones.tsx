import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, Bot, Building2, ChevronDown, ClipboardList, Map as MapaIcono, MoreHorizontal, Plus, Search, Trash2, X,
} from 'lucide-react';
import { useProyectos } from './proyectos';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav } from './components';
import DialogoConfirmar from './components/DialogoConfirmar';
import { BACKEND_URL } from './sesion';
import { etiquetaMotivo } from './motivos';
import { duracion as duracionTexto } from './formato';

interface InspeccionesProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  /** Abrir una inspección en el plano de su edificio */
  onVer: (edificioId: string, relevamientoId: number) => void;
}



const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
};
const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
/** Segundos que duró (para ordenar); en curso cuenta hasta ahora. */
const segundos = (inicio?: string | null, fin?: string | null) =>
  inicio ? ((fin ? new Date(fin) : new Date()).getTime() - new Date(inicio).getTime()) / 1000 : -1;

type Columna = 'fecha' | 'edificio' | 'duracion' | 'hallazgos';
const codigo = (id: number) => `INS-${String(id).padStart(4, '0')}`;

/** Todas las inspecciones de todos los edificios, con filtros. */
export default function Inspecciones({ activeTab, onTabChange, onVer }: InspeccionesProps) {
  const { proyectos, cargando, error, recargar } = useProyectos();
  const [texto, setTexto] = useState('');
  const [robot, setRobot] = useState('todos');
  const [conHallazgos, setConHallazgos] = useState('todos');
  const [proyecto, setProyecto] = useState('todos');
  const [orden, setOrden] = useState<{ col: Columna; asc: boolean }>({ col: 'fecha', asc: false });
  const [menuDe, setMenuDe] = useState<number | null>(null);
  const [borrando, setBorrando] = useState<{ id: number; texto: string; enviando: boolean; error: string | null } | null>(null);

  useEffect(() => { recargar(); }, [recargar]);

  const todas = useMemo(() => proyectos.flatMap(p => p.buildings.flatMap(b => b.historial
    .filter(h => h.id !== undefined)
    .map(h => ({ ...h, id: h.id as number, edificioId: b.id, edificio: b.name, proyecto: p.name }))))
    .sort((a, b) => (b.inicio ?? '').localeCompare(a.inicio ?? '')), [proyectos]);

  // Mientras haya una inspección en curso, la lista se actualiza sola
  const hayEnCurso = todas.some(i => i.estado === 'en_curso');
  useEffect(() => {
    if (!hayEnCurso) return;
    const t = setInterval(recargar, 10000);
    return () => clearInterval(t);
  }, [hayEnCurso, recargar]);

  const robots = [...new Set(todas.map(i => i.robot).filter(r => r && r !== '—'))].sort();
  const nombresProyectos = [...new Set(todas.map(i => i.proyecto))].sort();
  const q = texto.trim().toLowerCase();
  const filtradas = todas.filter(i =>
    (!q || [i.edificio, i.proyecto, codigo(i.id), i.planta ?? '', etiquetaMotivo(i.motivo) ?? ''].some(t => t.toLowerCase().includes(q))) &&
    (proyecto === 'todos' || i.proyecto === proyecto) &&
    (robot === 'todos' || i.robot === robot) &&
    (conHallazgos === 'todos' || (conHallazgos === 'con' ? i.detections > 0 : i.detections === 0)))
    .sort((a, b) => {
      const d = orden.col === 'edificio' ? a.edificio.localeCompare(b.edificio)
        : orden.col === 'duracion' ? segundos(a.inicio, a.fin) - segundos(b.inicio, b.fin)
        : orden.col === 'hallazgos' ? a.detections - b.detections
        : (a.inicio ?? '').localeCompare(b.inicio ?? '');
      return orden.asc ? d : -d;
    });
  const hayFiltros = !!q || robot !== 'todos' || conHallazgos !== 'todos' || proyecto !== 'todos';
  const ordenarPor = (col: Columna) => setOrden(o => (o.col === col ? { col, asc: !o.asc } : { col, asc: col === 'edificio' }));

  async function eliminar() {
    if (!borrando) return;
    setBorrando({ ...borrando, enviando: true, error: null });
    try {
      const r = await fetch(`${BACKEND_URL}/nube/api/relevamientos/${borrando.id}`, { method: 'DELETE' });
      if (r.status === 409) {
        setBorrando({ ...borrando, enviando: false, error: 'Esta inspección está en curso. Detenela antes de eliminarla.' });
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      await recargar();
      setBorrando(null);
    } catch {
      setBorrando({ ...borrando, enviando: false, error: 'No se pudo eliminar. Revisá tu conexión e intentá de nuevo.' });
    }
  }

  const hallazgos = todas.reduce((n, i) => n + i.detections, 0);
  const conDanos = todas.filter(i => i.detections > 0).length;
  const edificios = new Set(todas.map(i => i.edificioId)).size;

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <div className="flex-1 overflow-y-auto bg-[#F3F4F6]">
          <div className="w-full max-w-[1600px] mx-auto px-6 xl:px-8 pt-7 pb-10">

            {/* Encabezado */}
            <div className="flex items-end justify-between gap-4">
              <h1 className="text-[24px] font-semibold text-[#0F1A24] tracking-[-0.02em]">Inspecciones</h1>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onTabChange('inspeccion')}
                  className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-[#377DC0] text-white hover:bg-[#2F6CA8]">
                  <Plus className="w-4 h-4" /> Nueva inspección
                </button>
              </div>
            </div>

            {/* Indicadores */}
            <div className="mt-6 grid grid-cols-3 bg-white rounded-md border border-[#D4D4D4] divide-x divide-[#E5E7EB]">
              <Indicador Icon={ClipboardList} etiqueta="Inspecciones" valor={todas.length}
                detalle={`en ${edificios} edificaci${edificios === 1 ? 'ón' : 'ones'}`} />
              <Indicador Icon={Building2} etiqueta="Hallazgos" valor={hallazgos}
                detalle={todas.length ? `${(hallazgos / todas.length).toLocaleString('es-AR', { maximumFractionDigits: 1 })} por inspección` : '—'} />
              <Indicador Icon={AlertTriangle} etiqueta="Con daños encontrados" valor={conDanos}
                detalle={todas.length ? `de ${todas.length} inspecci${todas.length === 1 ? 'ón' : 'ones'}` : '—'} tono={conDanos ? '#C2410C' : undefined} />
            </div>

            {/* Tabla */}
            <div className="mt-6 bg-white rounded-md border border-[#D4D4D4] overflow-hidden">
              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-2.5 px-5 py-3 bg-[#F8F9FA] border-b border-[#E5E7EB]">
                <div className="flex items-center gap-1.5 px-2 h-8 flex-1 min-w-[240px] max-w-[380px] rounded-[3px] bg-white border border-[#D4D4D4] focus-within:border-[#377DC0] focus-within:outline focus-within:outline-1 focus-within:outline-[#377DC0]">
                  <Search className="w-4 h-4 text-[#8A8C8E] flex-none" />
                  <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar por código, edificación, planta o motivo"
                    className="bg-transparent outline-none text-[13px] w-full min-w-0 placeholder:text-[#A0A2A4]" />
                </div>
                <Desplegable valor={proyecto} onCambio={setProyecto}
                  opciones={[{ valor: 'todos', etiqueta: 'Todos los proyectos' }, ...nombresProyectos.map(p => ({ valor: p, etiqueta: p }))]} />
                <Desplegable valor={robot} onCambio={setRobot}
                  opciones={[{ valor: 'todos', etiqueta: 'Todos los robots' }, ...robots.map(r => ({ valor: r, etiqueta: r }))]} />
                <Desplegable valor={conHallazgos} onCambio={setConHallazgos}
                  opciones={[{ valor: 'todos', etiqueta: 'Con y sin hallazgos' }, { valor: 'con', etiqueta: 'Con hallazgos' }, { valor: 'sin', etiqueta: 'Sin hallazgos' }]} />
                {hayFiltros && (
                  <button type="button" onClick={() => { setTexto(''); setRobot('todos'); setConHallazgos('todos'); setProyecto('todos'); }}
                    className="flex items-center gap-1 h-8 px-2 rounded-[3px] text-[13px] font-medium text-[#66686A] hover:bg-black/[0.06]">
                    <X className="w-3.5 h-3.5" /> Limpiar filtros
                  </button>
                )}
              </div>

              {cargando && todas.length === 0 ? (
                <p className="px-5 py-10 text-center text-[13px] text-[#8A8C8E]">Cargando inspecciones…</p>
              ) : error ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-[13px] text-[#991B1B]">{error}</p>
                  <button type="button" onClick={() => recargar()}
                    className="mt-3 h-8 px-3 rounded-[3px] text-[13px] font-medium bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6]">
                    Reintentar
                  </button>
                </div>
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
                      <Th className="hidden xl:table-cell">Código</Th>
                      <Th orden={orden} col="fecha" onOrdenar={ordenarPor}>Fecha</Th>
                      <Th orden={orden} col="edificio" onOrdenar={ordenarPor}>Edificación</Th>
                      <Th className="hidden xl:table-cell">Motivo</Th>
                      <Th>Robot</Th>
                      <Th orden={orden} col="duracion" onOrdenar={ordenarPor}>Duración</Th>
                      <Th orden={orden} col="hallazgos" onOrdenar={ordenarPor}>Hallazgos</Th>
                      <Th>Estado</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map(i => (
                      <tr key={i.id} onClick={() => onVer(i.edificioId, i.id)}
                        className="group cursor-pointer border-b border-[#EEEFF1] last:border-0 hover:bg-[#F7FAFD] transition-colors">
                        <Td className="hidden xl:table-cell"><span className="font-mono text-[12px] text-[#66686A]">{codigo(i.id)}</span></Td>
                        <Td>
                          <span className="block text-[13px] font-medium text-[#1A1C1E] tabular-nums">{fechaCorta(i.inicio)}</span>
                          <span className="block text-[12px] text-[#8A8C8E] tabular-nums">{hora(i.inicio)}</span>
                        </Td>
                        <Td className="max-w-[220px] xl:max-w-[320px]">
                          <span className="block text-[13px] font-semibold text-[#0F1A24] truncate">{i.edificio}</span>
                          <span className="block text-[12px] text-[#8A8C8E] truncate">{i.proyecto}{i.planta ? ` · ${i.planta}` : ''}</span>
                        </Td>
                        <Td className="hidden xl:table-cell max-w-[220px]">
                          <span className="block text-[13px] text-[#1A1C1E] truncate">{etiquetaMotivo(i.motivo) ?? <span className="text-[#A0A2A4]">—</span>}</span>
                        </Td>
                        <Td>
                          <span className="flex items-center gap-2 text-[13px] text-[#1A1C1E]">
                            <span className="w-6 h-6 rounded-[3px] bg-[#F1F3F5] flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-[#66686A]" /></span>
                            {i.robot}
                          </span>
                        </Td>
                        <Td><span className="text-[13px] text-[#66686A] tabular-nums">{duracionTexto({ inicio: i.inicio ?? null, fin: i.fin ?? null, estado: i.estado ?? '' })}</span></Td>
                        <Td><Hallazgos total={i.detections} /></Td>
                        <Td><Estado enCurso={i.estado === 'en_curso'} /></Td>
                        <Td className="w-12 pr-4">
                          <div className="relative" onClick={e => e.stopPropagation()}>
                            <button type="button" onClick={() => setMenuDe(menuDe === i.id ? null : i.id)}
                              title="Más opciones" aria-label={`Más opciones de ${codigo(i.id)}`} aria-expanded={menuDe === i.id}
                              className={`w-7 h-7 flex items-center justify-center rounded-[4px] text-[#616161] hover:bg-black/[0.07] ${menuDe === i.id ? 'bg-black/[0.07]' : ''}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {menuDe === i.id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setMenuDe(null)} aria-hidden />
                                <div className="absolute right-0 top-full z-30 mt-1 w-[200px] rounded-[5px] bg-white border border-[#D4D4D4] shadow-[0_2px_8px_rgba(0,0,0,0.16)] p-1 text-left">
                                  <button type="button" onClick={() => { setMenuDe(null); onVer(i.edificioId, i.id); }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-left text-[14px] text-[#1A1C1E] hover:bg-[#377DC0] hover:text-white">
                                    <MapaIcono className="w-3.5 h-3.5" /> Ver en el plano
                                  </button>
                                  <button type="button"
                                    onClick={() => { setMenuDe(null); setBorrando({ id: i.id, texto: `${codigo(i.id)} de ${i.edificio} (${fechaCorta(i.inicio)}, ${hora(i.inicio)} hs)`, enviando: false, error: null }); }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-left text-[14px] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white">
                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar inspección
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {borrando && (
                <DialogoConfirmar titulo="¿Eliminar esta inspección?" enviando={borrando.enviando} error={borrando.error}
                  onConfirmar={eliminar} onCerrar={() => setBorrando(null)}>
                  Se borra la inspección <b>{borrando.texto}</b> con sus hallazgos, el camino del robot y las revisiones. No se puede deshacer.
                </DialogoConfirmar>
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

/** Encabezado de columna; si trae `col`, se puede tocar para ordenar. */
function Th({ children, col, orden, onOrdenar, className = '' }: {
  children?: React.ReactNode; col?: Columna; orden?: { col: Columna; asc: boolean }; onOrdenar?: (c: Columna) => void; className?: string;
}) {
  if (!col || !onOrdenar) return <th className={`px-4 xl:px-5 py-3 font-semibold ${className}`}>{children}</th>;
  const activa = orden?.col === col;
  return (
    <th className="px-4 xl:px-5 py-3 font-semibold">
      <button type="button" onClick={() => onOrdenar(col)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.06em] hover:text-[#1A1C1E] ${activa ? 'text-[#1A1C1E]' : ''}`}>
        {children}
        {activa && (orden!.asc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </th>
  );
}
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) =>
  <td className={`px-4 xl:px-5 py-3.5 align-middle whitespace-nowrap ${className}`}>{children}</td>;

/** Cantidad de hallazgos (daños encontrados) de la inspección. */
function Hallazgos({ total }: { total: number }) {
  if (total === 0) return <span className="text-[12px] text-[#A0A2A4]">Sin hallazgos</span>;
  return <span className="text-[13px] font-semibold text-[#1A1C1E] tabular-nums">{total}</span>;
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
