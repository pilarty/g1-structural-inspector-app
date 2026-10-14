import React, { useEffect, useState } from 'react';
import { Building2, ChevronRight, Folder, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useProyectos } from './proyectos';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton, ProjectsSidebar } from './components';
import DialogoConfirmar from './components/DialogoConfirmar';
import { eliminado, nuevoEdificioEn } from './navegacion';
import { etiquetaDe } from './edificioForm';
import { FINALIDADES, eliminarProyecto, obtenerProyecto, type ProyectoApi } from './proyectoForm';

interface FichaProyectoProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  proyectoId: string;
  onEditar: () => void;
  /** Abrir la ficha de una de sus edificaciones */
  onAbrirEdificio: (id: string) => void;
  /** Barra lateral: abrir un edificio de la lista */
  onSeleccionarEnBarra: (id: string) => void;
}

const fecha = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
const cuit = (c: string | null) => (c && /^\d{11}$/.test(c) ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : c);


export default function FichaProyecto({ activeTab, onTabChange, proyectoId, onEditar, onAbrirEdificio, onSeleccionarEnBarra }: FichaProyectoProps) {
  const { proyectos, recargar } = useProyectos();
  const [p, setP] = useState<ProyectoApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<{ enviando: boolean; error: string | null; inspecciones: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    setP(null);
    setError(null);
    obtenerProyecto(proyectoId)
      .then(x => vivo && setP(x))
      .catch(() => vivo && setError('No se pudo cargar el proyecto. Revisá tu conexión.'));
    return () => { vivo = false; };
  }, [proyectoId]);

  const edificios = proyectos.find(x => x.id === proyectoId)?.buildings ?? [];
  const inspeccionesTotales = edificios.reduce((n, b) => n + b.relevamientos, 0);

  async function confirmarEliminar() {
    const inspecciones = borrando?.inspecciones ?? 0;
    setBorrando({ enviando: true, error: null, inspecciones });
    const r = await eliminarProyecto(proyectoId, inspecciones > 0);
    if (r.ok) {
      await recargar();
      setBorrando(null);
      eliminado('proyecto', proyectoId);
      return;
    }
    setBorrando(r.motivo === 'en_uso'
      ? { enviando: false, error: null, inspecciones: r.relevamientos }
      : { enviando: false, error: 'No se pudo eliminar. Revisá tu conexión e intentá de nuevo.', inspecciones });
  }

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <div className="flex flex-1 overflow-hidden">
          <ProjectsSidebar selectedBuildingId={null} proyectoSeleccionado={proyectoId} onSelectBuilding={onSeleccionarEnBarra} />
          <div className="flex-1 overflow-y-auto bg-[#F3F6F9]">
            <div className="w-full px-8 pt-8 pb-10">

              {error && <p className="text-[14px] text-[#991B1B]">{error}</p>}
              {!p && !error && (
                <p className="flex items-center gap-2 text-[14px] text-[#8A8C8E]"><Loader2 className="w-4 h-4 animate-spin" /> Cargando el proyecto…</p>
              )}

              {p && (
                <div className="bg-white rounded-lg border border-[#14202B]/[0.07] shadow-[0_1px_2px_rgba(20,32,43,0.04),0_8px_24px_rgba(20,32,43,0.05)]">

                  {/* Cabecera */}
                  <div className="px-6 py-6 flex items-center gap-4 border-b border-[#14202B]/[0.06]">
                    <span className="flex-none w-12 h-12 rounded-2xl bg-[#E3EEF8] text-[#377DC0] flex items-center justify-center">
                      <Folder className="w-6 h-6" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight truncate">{p.nombre}</h1>
                      <div className="flex items-center gap-2 mt-1">
                        {p.finalidad && <span className="text-[13px] text-[#8A8C8E] truncate">{etiquetaDe(FINALIDADES, p.finalidad)}</span>}
                      </div>
                    </div>
                    <button type="button" onClick={() => setBorrando({ enviando: false, error: null, inspecciones: inspeccionesTotales })}
                      className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-white text-[#B91C1C] border border-[#D4D4D4] hover:bg-[#FEF2F2] hover:border-[#FCA5A5]">
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                    <PrimaryButton onClick={onEditar} shadow icon={<Pencil className="w-4 h-4" />}>Editar</PrimaryButton>
                  </div>

                  <Seccion titulo="Proyecto">
                    <Dato etiqueta="Finalidad de la inspección" valor={etiquetaDe(FINALIDADES, p.finalidad)} />
                    <Dato etiqueta="Responsable" valor={p.responsable} />
                    <Dato etiqueta="Fecha de inicio" valor={fecha(p.fecha_inicio)} />
                    <Dato etiqueta="Fecha estimada de fin" valor={fecha(p.fecha_fin_estimada)} />
                    <Dato etiqueta="Alta" valor={fecha(p.fecha_alta)} />
                    <Dato etiqueta="Descripción" valor={p.descripcion} ancho />
                  </Seccion>

                  <Seccion titulo="Cliente">
                    <Dato etiqueta="Nombre o razón social" valor={p.cliente_nombre} />
                    <Dato etiqueta="Tipo de cliente" valor={p.tipo_cliente} />
                    <Dato etiqueta="CUIT" valor={cuit(p.cliente_cuit)} />
                    <Dato etiqueta="Teléfono" valor={p.cliente_telefono} />
                    <Dato etiqueta="Email" valor={p.cliente_email} />
                  </Seccion>

                  {/* Edificaciones del proyecto */}
                  <section className="px-6 py-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[16px] font-bold text-[#1A1C1E]">
                        Edificaciones <span className="text-[#8A8C8E] font-semibold">· {edificios.length}</span>
                      </h2>
                      <button type="button" onClick={() => nuevoEdificioEn(proyectoId)}
                        className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6]">
                        <Plus className="w-4 h-4" /> Nueva edificación
                      </button>
                    </div>
                    {edificios.length === 0 ? (
                      <p className="mt-3 text-[13px] text-[#A0A2A4]">Todavía no tiene edificaciones.</p>
                    ) : (
                      <ul className="mt-3 divide-y divide-[#14202B]/[0.06]">
                        {edificios.map(b => (
                          <li key={b.id}>
                            <button type="button" onClick={() => onAbrirEdificio(b.id)}
                              className="w-full flex items-center gap-3 py-3 text-left hover:bg-[#F8FAFC] -mx-2 px-2 rounded-lg transition-colors">
                              <Building2 className="w-4 h-4 flex-none text-[#377DC0]" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-semibold text-[#1A1C1E] truncate">{b.name}</p>
                                <p className="text-[12px] text-[#8A8C8E] truncate">{b.address || 'Sin dirección'}</p>
                              </div>
                              <span className="flex-none text-[12px] text-[#8A8C8E]">
                                {b.relevamientos > 0 ? `${b.relevamientos} inspección${b.relevamientos === 1 ? '' : 'es'}` : 'Sin inspecciones'}
                              </span>
                              <ChevronRight className="w-4 h-4 flex-none text-[#A0A2A4]" />
                            </button>
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

      {borrando && p && (
        <DialogoConfirmar
          titulo={`¿Eliminar el proyecto ${p.nombre}?`}
          enviando={borrando.enviando}
          error={borrando.error}
          escribir={borrando.inspecciones > 0 ? p.nombre : undefined}
          onConfirmar={confirmarEliminar}
          onCerrar={() => setBorrando(null)}
        >
          {edificios.length > 0
            ? `También se borran sus ${edificios.length} edificaci${edificios.length === 1 ? 'ón' : 'ones'} con sus documentos. `
            : 'El proyecto no tiene edificaciones. '}
          {borrando.inspecciones > 0 && (
            <>Además se borran para siempre <b className="text-[#991B1B]">{borrando.inspecciones} inspección{borrando.inspecciones === 1 ? '' : 'es'}</b> con sus hallazgos e informes. </>
          )}
          No se puede deshacer.
        </DialogoConfirmar>
      )}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="px-6 py-6 border-b border-[#14202B]/[0.06]">
      <h2 className="text-[16px] font-bold text-[#1A1C1E]">{titulo}</h2>
      <dl className="mt-4 grid grid-cols-3 gap-x-6 gap-y-4">{children}</dl>
    </section>
  );
}

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
