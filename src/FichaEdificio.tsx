import React, { useEffect, useState } from 'react';
import { ArrowLeft, Building2, ChevronRight, Download, FileText, Home, Layers, Loader2, MapPin, Pencil, ScanLine, Trash2 } from 'lucide-react';
import SeverityBadge from './components/SeverityBadge';
import { useProyectos } from './proyectos';
import DialogoConfirmar from './components/DialogoConfirmar';
import { eliminado } from './navegacion';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton, ProjectsSidebar } from './components';
import {
  DESTINOS, TIPOS_PROPIEDAD, NOMBRE_DOCUMENTO, eliminarEdificacion, enlaceDocumento, etiquetaDe, listarDocumentos, obtenerEdificacion,
  type DocumentoGuardado, type EdificacionApi,
} from './edificioForm';

interface FichaEdificioProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  edificioId: string;
  onVolver: () => void;
  onEditar: () => void;
  /** Barra lateral: abrir la ficha de otro edificio */
  onAbrirEdificio: (id: string) => void;
  /** Abrir una inspección (relevamiento) de este edificio en el plano */
  onVerInspeccion: (relevamientoId: number) => void;
  /** Barra lateral: botón «+ Nuevo» */
  onNuevoEdificio: () => void;
}

const ICONO_TIPO: Record<string, React.ReactNode> = {
  casa: <Home className="w-6 h-6" />, edificio: <Building2 className="w-6 h-6" />, ph: <Layers className="w-6 h-6" />,
};

const num = (v: number | string | null, sufijo = '') =>
  v === null || v === undefined || v === '' ? null : `${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 3 })}${sufijo}`;
const pesos = (v: number | string | null) =>
  v === null || v === undefined || v === '' ? null : Number(v).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : null);

export default function FichaEdificio({ activeTab, onTabChange, edificioId, onVolver, onEditar, onAbrirEdificio, onNuevoEdificio, onVerInspeccion }: FichaEdificioProps) {
  const { proyectos, recargar } = useProyectos();
  const inspecciones = proyectos.flatMap(x => x.buildings).find(b => b.id === edificioId)?.historial ?? [];
  const [borrando, setBorrando] = useState<{ enviando: boolean; error: string | null; inspecciones: number } | null>(null);

  async function confirmarEliminar() {
    const inspecciones = borrando?.inspecciones ?? 0;
    setBorrando({ enviando: true, error: null, inspecciones });
    const r = await eliminarEdificacion(edificioId, inspecciones > 0);
    if (r.ok) {
      await recargar();
      setBorrando(null);
      eliminado('edificio', edificioId);
      return;
    }
    // Si la nube encontró inspecciones que la app no sabía, se pide la confirmación fuerte
    setBorrando(r.motivo === 'en_uso'
      ? { enviando: false, error: null, inspecciones: r.relevamientos }
      : { enviando: false, error: 'No se pudo eliminar. Revisá tu conexión e intentá de nuevo.', inspecciones });
  }
  const [e, setE] = useState<EdificacionApi | null>(null);
  const [docs, setDocs] = useState<DocumentoGuardado[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setE(null);
    setError(null);
    Promise.all([obtenerEdificacion(edificioId), listarDocumentos(edificioId).catch(() => [])])
      .then(([ed, ds]) => { if (vivo) { setE(ed); setDocs(ds); } })
      .catch(() => vivo && setError('No se pudo cargar la ficha del inmueble. Revisá tu conexión.'));
    return () => { vivo = false; };
  }, [edificioId]);

  const proyecto = e ? proyectos.find(p => p.id === String(e.proyecto_id))?.name : undefined;
  const anio = e
    ? e.anio_precision === 'desconocido' || !e.anio_construccion ? 'Desconocido'
      : `${e.anio_construccion}${e.anio_precision === 'aproximado' ? ' (aproximado)' : ''}`
    : null;
  const pisos = e?.pisos_sobre_pb ?? (e?.cantidad_plantas ? e.cantidad_plantas - 1 : null);

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <div className="flex flex-1 overflow-hidden">
        <ProjectsSidebar selectedBuildingId={edificioId} onSelectBuilding={onAbrirEdificio} />
        <div className="flex-1 overflow-y-auto bg-[#F3F6F9]">
          <div className="w-full px-8 pt-6 pb-10">

            <button type="button" onClick={onVolver}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#377DC0] hover:opacity-75 mb-4">
              <ArrowLeft className="w-4 h-4" /> Volver al edificio
            </button>

            {error && <p className="text-[14px] text-[#991B1B]">{error}</p>}
            {!e && !error && (
              <p className="flex items-center gap-2 text-[14px] text-[#8A8C8E]"><Loader2 className="w-4 h-4 animate-spin" /> Cargando la ficha…</p>
            )}

            {e && (
              <div className="bg-white rounded-lg border border-[#14202B]/[0.07] shadow-[0_1px_2px_rgba(20,32,43,0.04),0_8px_24px_rgba(20,32,43,0.05)]">

                {/* Cabecera */}
                <div className="px-6 py-6 flex items-center gap-4 border-b border-[#14202B]/[0.06]">
                  <span className="flex-none w-12 h-12 rounded-2xl bg-[#E3EEF8] text-[#377DC0] flex items-center justify-center">
                    {ICONO_TIPO[e.tipo_propiedad ?? ''] ?? <Building2 className="w-6 h-6" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight truncate">{e.nombre}</h1>
                    <p className="text-[13px] text-[#8A8C8E] mt-0.5 truncate">
                      {[etiquetaDe(TIPOS_PROPIEDAD, e.tipo_propiedad), etiquetaDe(DESTINOS, e.destino), proyecto && `Proyecto ${proyecto}`]
                        .filter(x => x && x !== '—').join(' · ')}
                    </p>
                  </div>
                  <button type="button" onClick={() => setBorrando({ enviando: false, error: null, inspecciones: proyectos.flatMap(p => p.buildings).find(b => b.id === edificioId)?.relevamientos ?? 0 })}
                    className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-white text-[#B91C1C] border border-[#D4D4D4] hover:bg-[#FEF2F2] hover:border-[#FCA5A5]">
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                  <PrimaryButton onClick={onEditar} shadow icon={<Pencil className="w-4 h-4" />}>Editar</PrimaryButton>
                </div>

                <Seccion numero={1} titulo="Identificación">
                  <Dato etiqueta="Nombre de referencia" valor={e.nombre} />
                  <Dato etiqueta="Tipo de propiedad" valor={etiquetaDe(TIPOS_PROPIEDAD, e.tipo_propiedad)} />
                  <Dato etiqueta="Destino o uso" valor={etiquetaDe(DESTINOS, e.destino)} />
                  <Dato etiqueta="Proyecto" valor={proyecto ?? null} />
                  <Dato etiqueta="Alta" valor={fecha(e.fecha_alta)} />
                </Seccion>

                <Seccion numero={2} titulo="Ubicación">
                  <Dato etiqueta="Calle y número" valor={e.calle_numero ?? e.direccion} ancho />
                  <Dato etiqueta="Localidad" valor={e.localidad} />
                  <Dato etiqueta="Provincia" valor={e.provincia} />
                  <Dato etiqueta="País" valor={e.pais} />
                  <Dato etiqueta="Código postal" valor={e.codigo_postal} />
                  <Dato etiqueta="Coordenadas" ancho valor={e.latitud !== null && e.longitud !== null
                    ? <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#10B981]" />{Number(e.latitud).toFixed(6)}, {Number(e.longitud).toFixed(6)}</span>
                    : null} />
                </Seccion>

                <Seccion numero={3} titulo="Datos del inmueble">
                  <Dato etiqueta="Año de construcción" valor={anio} />
                  <Dato etiqueta="Pisos sobre planta baja" valor={pisos === null ? null : String(pisos)} />
                  <Dato etiqueta="Subsuelos" valor={num(e.subsuelos)} />
                  <Dato etiqueta="Superficie cubierta" valor={num(e.superficie_cubierta, ' m²')} />
                  <Dato etiqueta="Superficie del terreno" valor={num(e.superficie_terreno, ' m²')} />
                  <Dato etiqueta="Modificaciones o ampliaciones" valor={e.modificaciones} ancho />
                </Seccion>

                <Seccion numero={4} titulo="Datos registrales y catastrales">
                  <Dato etiqueta="Matrícula" valor={e.matricula} />
                  <Dato etiqueta="Nomenclatura catastral" valor={e.nomenclatura_catastral} />
                  <Dato etiqueta="Partida inmobiliaria" valor={e.partida_inmobiliaria} />
                  <Dato etiqueta="Valuación fiscal" valor={pesos(e.valuacion_fiscal)} />
                  <Dato etiqueta="Linderos" valor={e.linderos} ancho />
                </Seccion>

                {e.tipo_propiedad === 'ph' && (
                  <Seccion numero={5} titulo="Propiedad horizontal">
                    <Dato etiqueta="Unidades funcionales" valor={num(e.ph_unidades_funcionales)} />
                    <Dato etiqueta="Unidad funcional y complementaria" valor={e.ph_unidad_funcional} />
                    <Dato etiqueta="Porcentual" valor={num(e.ph_porcentual, ' %')} />
                  </Seccion>
                )}

                <Seccion numero={e.tipo_propiedad === 'ph' ? 6 : 5} titulo="Responsable y contacto">
                  <Dato etiqueta="Propietario o administrador" valor={e.responsable} />
                  <Dato etiqueta="Teléfono o email" valor={e.contacto} />
                </Seccion>

                {/* Historial de inspecciones (de la más reciente a la más antigua) */}
                <section className="px-6 py-6 border-b border-[#14202B]/[0.06]">
                  <Titulo numero={e.tipo_propiedad === 'ph' ? 7 : 6} titulo={`Inspecciones · ${inspecciones.length}`} />
                  {inspecciones.length === 0 ? (
                    <p className="mt-3 text-[13px] text-[#A0A2A4]">Todavía no tiene inspecciones.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-[#14202B]/[0.06]">
                      {inspecciones.map((r, i) => (
                        <li key={r.id ?? i}>
                          <button type="button" disabled={r.id === undefined} onClick={() => r.id !== undefined && onVerInspeccion(r.id)}
                            className="w-full flex items-center gap-4 py-3 text-left hover:bg-[#F8FAFC] -mx-2 px-2 rounded-lg transition-colors">
                            <ScanLine className="w-4 h-4 flex-none text-[#377DC0]" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold text-[#1A1C1E]">
                                {r.date}
                                {i === 0 && <span className="ml-2 text-[11px] font-semibold text-[#377DC0] bg-[#E3EEF8] px-1.5 py-0.5 rounded">Última</span>}
                                {r.estado === 'en_curso' && <span className="ml-2 text-[11px] font-semibold text-[#065F46] bg-[#ECFDF5] px-1.5 py-0.5 rounded">En curso</span>}
                              </p>
                              <p className="text-[12px] text-[#8A8C8E] truncate">
                                Robot {r.robot}{r.operador && r.operador !== '—' ? ` · Operador ${r.operador}` : ''}
                              </p>
                            </div>
                            <span className="flex-none text-[13px] font-semibold text-[#1A1C1E] tabular-nums w-[110px] text-right">
                              {r.detections} hallazgo{r.detections === 1 ? '' : 's'}
                            </span>
                            <span className="flex-none w-[96px] flex justify-end">{r.detections > 0 ? <SeverityBadge level={r.severity} /> : <span className="text-[12px] text-[#A0A2A4]">—</span>}</span>
                            <span className="flex-none flex items-center gap-1 text-[12px] font-semibold text-[#377DC0]">
                              Ver en el plano <ChevronRight className="w-4 h-4" />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="px-6 py-6">
                  <Titulo numero={e.tipo_propiedad === 'ph' ? 8 : 7} titulo="Documentación adjunta" />
                  {docs.length === 0 ? (
                    <p className="mt-3 text-[13px] text-[#A0A2A4]">Sin documentos. Podés sumarlos desde «Editar».</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-[#14202B]/[0.06]">
                      {docs.map(d => (
                        <li key={d.id} className="flex items-center gap-3 py-2.5">
                          <FileText className="w-4 h-4 flex-none text-[#8A8C8E]" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-[#1A1C1E] truncate">{d.descripcion ?? 'Documento'}</p>
                            <p className="text-[12px] text-[#8A8C8E]">
                              {NOMBRE_DOCUMENTO[d.tipo_archivo ?? ''] ?? 'Documento'}{d.fecha_carga ? ` · ${fecha(d.fecha_carga)}` : ''}
                            </p>
                          </div>
                          <a href={enlaceDocumento(d)} download
                            className="flex-none flex items-center gap-1.5 text-[13px] font-semibold text-[#377DC0] hover:opacity-75">
                            <Download className="w-4 h-4" /> Descargar
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {borrando && e && (
        <DialogoConfirmar
          titulo={`¿Eliminar ${e.nombre}?`}
          enviando={borrando.enviando}
          error={borrando.error}
          escribir={borrando.inspecciones > 0 ? e.nombre ?? undefined : undefined}
          onConfirmar={confirmarEliminar}
          onCerrar={() => setBorrando(null)}
        >
          {borrando.inspecciones > 0
            ? <>Tiene <b className="text-[#991B1B]">{borrando.inspecciones} inspección{borrando.inspecciones === 1 ? '' : 'es'}</b>. Se borran para siempre su ficha, sus documentos y todas sus inspecciones con sus hallazgos e informes. No se puede deshacer.</>
            : <>Se borran su ficha y sus {docs.length} documento{docs.length === 1 ? '' : 's'}. No se puede deshacer.</>}
        </DialogoConfirmar>
      )}
    </div>
  );
}

function Titulo({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="text-[13px] font-bold text-[#377DC0] tabular-nums">{String(numero).padStart(2, '0')}</span>
      <h2 className="text-[16px] font-bold text-[#1A1C1E]">{titulo}</h2>
    </div>
  );
}

function Seccion({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="px-6 py-6 border-b border-[#14202B]/[0.06]">
      <Titulo numero={numero} titulo={titulo} />
      <dl className="mt-4 grid grid-cols-3 gap-x-6 gap-y-4">{children}</dl>
    </section>
  );
}

/** Un dato de la ficha; si no se cargó, se muestra «No cargado» en gris. */
function Dato({ etiqueta, valor, ancho }: { etiqueta: string; valor: React.ReactNode; ancho?: boolean }) {
  const vacio = valor === null || valor === undefined || valor === '' || valor === '—';
  return (
    <div className={`min-w-0 ${ancho ? 'col-span-3' : ''}`}>
      <dt className="text-[12px] text-[#8A8C8E]">{etiqueta}</dt>
      <dd className={`text-[14px] mt-0.5 ${vacio ? 'text-[#A0A2A4]' : 'font-semibold text-[#1A1C1E]'} ${ancho ? 'whitespace-pre-line' : 'truncate'}`}>
        {vacio ? 'No cargado' : valor}
      </dd>
    </div>
  );
}
