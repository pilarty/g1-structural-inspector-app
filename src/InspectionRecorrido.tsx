import { useEffect, useRef, useState } from 'react';
import { duracion, etiquetaEstado, fechaLarga, horaLocal } from './formato';
import { useRobots } from './robots';
import { DESTINOS, TIPOS_PROPIEDAD, etiquetaDe, obtenerEdificacion, type EdificacionApi } from './edificioForm';
import MapaHallazgos from './MapaHallazgos';
import ActivityBar, { NavTab } from './ActivityBar';
import type { Building } from './data';
import { useProyectos, EDIFICIO_VACIO } from './proyectos';
import { TopNav, ProjectsSidebar, PanelLabel, PanelText } from './components';
import { Map, FileText, FileDown, Loader2, MoreHorizontal, Play, Trash2 } from 'lucide-react';
import SelectorInspeccion from './components/SelectorInspeccion';
import { etiquetaMotivo } from './motivos';
import DialogoConfirmar from './components/DialogoConfirmar';
import { BACKEND_URL } from './sesion';
import { ordenPlanta, plantasDe } from './plantas';

// Si no hay una elegida, se muestra la primera edificación con inspecciones
// El edificio por defecto ahora sale de los datos de AWS (useProyectos).

type TabId = 'datos' | 'robot' | 'edificio';

interface InspectionRecorridoProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  selectedBuildingId?: string | null;
  onSelectBuilding?: (id: string) => void;
  /** Abre la ficha completa del inmueble (para verla o editarla) */
  onVerFicha?: (id: string) => void;
  /** Inspección elegida en el historial; si no viene, se muestra la última */
  relevamientoId?: number | null;
  /** Volver a mostrar la última inspección */
  onVerUltima?: () => void;
  /** Elegir otra inspección de la misma edificación (null = la última) */
  onElegirInspeccion?: (id: number | null) => void;
  /** Ir a «Iniciar inspección» con esta edificación (y su proyecto) ya elegidos */
  onIniciarInspeccion?: () => void;
}

export default function InspectionRecorrido({ activeTab, onTabChange, selectedBuildingId, onSelectBuilding, onVerFicha, relevamientoId, onVerUltima, onElegirInspeccion, onIniciarInspeccion }: InspectionRecorridoProps) {
  const [infoTab, setInfoTab] = useState<TabId>('datos');
  const [borrando, setBorrando] = useState<{ enviando: boolean; error: string | null } | null>(null);
  // Menú «⋯» de la inspección (exportar informe y eliminar)
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [exportando, setExportando] = useState(false);
  const exportarRef = useRef<(() => Promise<void>) | null>(null);
  const { proyectos, recargar } = useProyectos();
  const { robots } = useRobots();
  // Ficha de la edificación (para el resumen de la solapa Edificio)
  const [ficha, setFicha] = useState<EdificacionApi | null>(null);
  useEffect(() => {
    recargar();
  }, [recargar]);
  const edificios = proyectos.flatMap(p => p.buildings);
  const currentBuildingId = selectedBuildingId ?? edificios[0]?.id ?? '';

  const edificio: Building =
    edificios.find(b => b.id === currentBuildingId) ?? EDIFICIO_VACIO;
  // Si se eligió una inspección anterior del historial, se muestra esa en vez de la última
  const elegida = relevamientoId ? edificio.historial.find(h => h.id === relevamientoId) : undefined;
  const esAnterior = !!elegida && elegida.id !== edificio.ultimoRelevamiento?.id;
  const currentBuilding: Building = elegida && elegida.id !== undefined
    ? {
        ...edificio,
        ultimoRelevamiento: { id: elegida.id, estado: elegida.estado ?? '', inicio: elegida.inicio ?? null, fin: elegida.fin ?? null, planta: elegida.planta, motivo: elegida.motivo, observaciones: elegida.observaciones },
        lastRelevamientoDate: elegida.date,
        lastDetections: elegida.detections,
        lastRobot: elegida.robot,
        lastOperator: elegida.operador ?? edificio.lastOperator,
      }
    : edificio;

  useEffect(() => {
    if (!currentBuildingId) { setFicha(null); return; }
    let vivo = true;
    setFicha(null);
    obtenerEdificacion(currentBuildingId).then(f => vivo && setFicha(f)).catch(() => vivo && setFicha(null));
    return () => { vivo = false; };
  }, [currentBuildingId]);

  // Plantas e inspecciones de esta edificación
  const SIN_PLANTA = 'Sin planta indicada';
  const plantaDe = (p?: string) => p || SIN_PLANTA;
  const inspecciones = edificio.historial.filter(h => h.id !== undefined);
  const plantaActual = plantaDe(currentBuilding.ultimoRelevamiento?.planta);
  const plantasEdificio = plantasDe(ficha?.pisos_sobre_pb ?? edificio.pisos, ficha?.subsuelos ?? edificio.subsuelos);
  const plantasConInspeccion = new Set(inspecciones.map(h => plantaDe(h.planta)));
  const plantas = [...new Set([...plantasEdificio, ...plantasConInspeccion])]
    .sort((a, b) => (a === SIN_PLANTA ? 1 : b === SIN_PLANTA ? -1 : ordenPlanta(a) - ordenPlanta(b)));
  // El selector de plantas solo aparece si la edificación tiene más de una planta;
  // si no, en «Inspección» se ven todas
  const variasPlantas = plantasEdificio.length > 1;
  const deLaPlanta = variasPlantas ? inspecciones.filter(h => plantaDe(h.planta) === plantaActual) : inspecciones;
  const elegir = (id: number) => onElegirInspeccion?.(id === edificio.ultimoRelevamiento?.id ? null : id);

  // Eliminar la inspección que se está viendo
  async function eliminarInspeccion() {
    const rid = currentBuilding.ultimoRelevamiento?.id;
    if (!rid) return;
    setBorrando({ enviando: true, error: null });
    try {
      const r = await fetch(`${BACKEND_URL}/nube/api/relevamientos/${rid}`, { method: 'DELETE' });
      if (r.status === 409) {
        setBorrando({ enviando: false, error: 'Esta inspección está en curso. Detenela antes de eliminarla.' });
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      await recargar();
      onElegirInspeccion?.(null);
      setBorrando(null);
    } catch {
      setBorrando({ enviando: false, error: 'No se pudo eliminar. Revisá tu conexión e intentá de nuevo.' });
    }
  }

  const infoTabs: { id: TabId; label: string }[] = [
    { id: 'datos',    label: 'Datos del recorrido' },
    { id: 'robot',    label: 'Robot' },
    { id: 'edificio', label: 'Edificio' },
  ];

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab === 'recorrido' ? 'dashboard' : activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />

        <div className="flex flex-1 overflow-hidden">
          <ProjectsSidebar
            selectedBuildingId={currentBuildingId}
            onSelectBuilding={id => onSelectBuilding?.(id)}
          />

        <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-[#F3F6F9] bg-[radial-gradient(#DDE3EA_1px,transparent_1px)] [background-size:16px_16px]">

        {/* Plantas e inspecciones de la edificación */}
        {inspecciones.length > 0 && (
          <div className="flex-none flex items-center gap-3 h-14 px-4 bg-white border-b border-[#E5E7EB] whitespace-nowrap min-w-0">
            {variasPlantas && <>
            <span className="text-[12px] font-semibold text-[#66686A]">Planta</span>
            {/* Plantas como control segmentado: la elegida resalta en blanco (si no entran, se desplazan) */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-[#F1F3F5] min-w-0 overflow-x-auto [scrollbar-width:none]">
              {plantas.map(p => {
                const delas = inspecciones.filter(h => plantaDe(h.planta) === p);
                const activa = p === plantaActual;
                return (
                  <button key={p} type="button" disabled={delas.length === 0}
                    onClick={() => delas[0]?.id !== undefined && elegir(delas[0].id)}
                    title={delas.length === 0 ? 'Sin inspecciones en esta planta' : undefined}
                    className={`flex-none flex items-center gap-1.5 h-8 px-3 rounded-[5px] text-[13px] transition-colors ${
                      activa ? 'bg-white text-[#1A1C1E] font-semibold shadow-[0_1px_3px_rgba(20,32,43,0.14)]'
                        : delas.length ? 'text-[#1A1C1E] font-medium hover:bg-white/60'
                        : 'text-[#A0A2A4] font-medium cursor-default'
                    }`}>
                    {p}
                    {delas.length > 0 && (
                      <span className={`h-[18px] min-w-[18px] px-1 rounded-full text-[11px] font-semibold tabular-nums flex items-center justify-center ${activa ? 'bg-[#E3EEF8] text-[#1E4E7C]' : 'bg-black/[0.06] text-[#66686A]'}`}>{delas.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
            </>}
            {!variasPlantas && <>
              {/* Una sola planta: se muestra cuál es, sin poder cambiarla */}
              <span className="text-[12px] font-semibold text-[#66686A]">Planta</span>
              <div className="flex items-center p-0.5 rounded-md bg-[#F1F3F5]">
                <span className="flex items-center h-8 px-3 rounded-[5px] text-[13px] bg-white text-[#1A1C1E] font-semibold shadow-[0_1px_3px_rgba(20,32,43,0.14)]">
                  {plantasEdificio[0]}
                </span>
              </div>
            </>}
            <div className="flex-1 min-w-2" />
            <SelectorInspeccion
              inspecciones={deLaPlanta}
              elegida={currentBuilding.ultimoRelevamiento?.id}
              ultimaId={edificio.ultimoRelevamiento?.id}
              onElegir={elegir}
            />
            {esAnterior && onVerUltima && (
              <button type="button" onClick={onVerUltima}
                className="flex-none h-9 px-2 rounded-[3px] text-[13px] font-medium text-[#377DC0] hover:bg-[#EEF4FB] transition-colors">
                Ir a la última
              </button>
            )}
            <div className="relative flex-none">
              <button type="button" onClick={() => setMenuAbierto(x => !x)} aria-expanded={menuAbierto}
                title="Más opciones de la inspección" aria-label="Más opciones de la inspección"
                className={`w-9 h-9 flex items-center justify-center rounded-[3px] border transition-colors ${
                  menuAbierto ? 'bg-[#EEF4FB] border-[#377DC0]/50 text-[#1E4E7C]' : 'bg-white border-[#D4D4D4] text-[#424242] hover:bg-[#F3F4F6]'
                }`}>
                {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
              </button>
              {menuAbierto && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuAbierto(false)} aria-hidden />
                  <div className="absolute right-0 top-full z-30 mt-1 w-[210px] rounded-[5px] bg-white border border-[#D4D4D4] shadow-[0_2px_8px_rgba(0,0,0,0.16)] p-1">
                    <button type="button" disabled={exportando || !currentBuilding.relevamientos}
                      onClick={() => { setMenuAbierto(false); exportarRef.current?.(); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-left text-[14px] text-[#1A1C1E] hover:bg-[#377DC0] hover:text-white disabled:text-[#A0A2A4] disabled:hover:bg-transparent">
                      <FileDown className="w-3.5 h-3.5" /> {exportando ? 'Armando informe…' : 'Descargar informe'}
                    </button>
                    <button type="button"
                      onClick={() => { setMenuAbierto(false); setBorrando({ enviando: false, error: null }); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-left text-[14px] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white">
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar inspección
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Floor plan */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          {currentBuilding.relevamientos > 0 ? (
            <MapaHallazgos
              relevamientoId={currentBuilding.ultimoRelevamiento?.id}
              enCurso={currentBuilding.ultimoRelevamiento?.estado === 'en_curso'}
              exportarRef={exportarRef}
              onExportando={setExportando}
              informe={{
                proyecto: proyectos.find(p => p.buildings.some(b => b.id === edificio.id))?.name ?? '—',
                proyectoId: proyectos.find(p => p.buildings.some(b => b.id === edificio.id))?.id ?? null,
                relevamientoId: currentBuilding.ultimoRelevamiento?.id ?? 0,
                edificacion: edificio.name,
                direccion: ficha?.direccion || edificio.address,
                planta: currentBuilding.ultimoRelevamiento?.planta ?? 'Sin indicar',
                motivo: etiquetaMotivo(currentBuilding.ultimoRelevamiento?.motivo),
                observaciones: currentBuilding.ultimoRelevamiento?.observaciones ?? null,
                fecha: currentBuilding.lastRelevamientoDate,
                inicio: horaLocal(currentBuilding.ultimoRelevamiento?.inicio),
                fin: currentBuilding.ultimoRelevamiento?.fin ? horaLocal(currentBuilding.ultimoRelevamiento.fin) : 'En curso',
                duracion: currentBuilding.ultimoRelevamiento ? duracion(currentBuilding.ultimoRelevamiento) : '—',
                robot: currentBuilding.lastRobot,
              }}
            />
          ) : (
            /* Sin inspecciones */
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <Map className="w-8 h-8 text-[#C4C7CA] mb-4" />
              <h3 className="text-[16px] font-semibold text-[#1A1C1E] mb-2">Todavía no hay inspecciones</h3>
              <p className="text-[13px] text-[#8A8C8E] max-w-[300px] leading-relaxed">
                Esta edificación todavía no se inspeccionó. Cuando el robot la recorra, acá vas a ver el plano y los daños encontrados.
              </p>
              {onIniciarInspeccion && currentBuilding.id && (
                <button type="button" onClick={onIniciarInspeccion}
                  className="mt-5 flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-[#377DC0] text-white hover:bg-[#2F6CA8]">
                  <Play className="w-4 h-4" /> Iniciar inspección
                </button>
              )}
            </div>
          )}

        </div>

        {/* Datos de abajo: tarjeta flotante, igual que el panel de hallazgos */}
        <div className="flex-none px-3 pb-3">
        <div className="rounded-lg bg-white/90 backdrop-blur-sm border border-[#E5E7EB] shadow-[0_4px_16px_rgba(20,32,43,0.10)]">

          {/* Solapas como control segmentado */}
          <div className="flex items-center gap-3 px-4 pt-3">
            <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-[#F1F3F5]">
              {infoTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInfoTab(tab.id)}
                  className={`h-8 px-3 rounded-[5px] text-[13px] transition-colors ${
                    infoTab === tab.id
                      ? 'bg-white text-[#1A1C1E] font-semibold shadow-[0_1px_3px_rgba(20,32,43,0.14)]'
                      : 'text-[#66686A] font-medium hover:text-[#1A1C1E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            {currentBuilding.id && onVerFicha && (
              <button
                type="button"
                onClick={() => onVerFicha(currentBuilding.id)}
                className="flex items-center justify-center gap-2 h-8 px-3 rounded-[3px] text-[13px] font-medium transition-colors bg-[#377DC0] text-white hover:bg-[#2F6CA8]"
              >
                <FileText className="w-4 h-4" /> Ficha del inmueble
              </button>
            )}
          </div>

          <div className="px-5 pt-3.5 pb-4 h-[86px] overflow-hidden [&_p]:whitespace-nowrap">
            {infoTab === 'datos' && (() => {
              const u = currentBuilding.ultimoRelevamiento;
              const hay = currentBuilding.relevamientos > 0 && !!u;
              const enCurso = u?.estado === 'en_curso';
              return (
              <div className="flex items-start">
                <div className="pr-8">
                  <PanelLabel>Inicio</PanelLabel>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {hay && <span className="w-2 h-2 rounded-full bg-[#10B981] flex-none" />}
                    <PanelText className="font-semibold">{hay ? fechaLarga(u?.inicio) : '—'}</PanelText>
                  </div>
                  <p className="text-[11px] text-[#8A8C8E] mt-0.5">{hay ? horaLocal(u?.inicio) : '\u00a0'}</p>
                </div>
                <div className="px-8 border-l border-[#E5E7EB]">
                  <PanelLabel>Fin</PanelLabel>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {hay && u?.fin && <span className="w-2 h-2 rounded-sm bg-[#377DC0] flex-none" />}
                    <PanelText className="font-semibold">{!hay ? '—' : u?.fin ? fechaLarga(u.fin) : enCurso ? 'Todavía no terminó' : '—'}</PanelText>
                  </div>
                  <p className="text-[11px] text-[#8A8C8E] mt-0.5">{hay && u?.fin ? horaLocal(u.fin) : '\u00a0'}</p>
                </div>
                <div className="px-8 border-l border-[#E5E7EB]">
                  <PanelLabel>Duración total</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{hay ? duracion(u) : '—'}</PanelText>
                  <p className="text-[11px] text-[#8A8C8E]">&nbsp;</p>
                </div>
                <div className="pl-8 border-l border-[#E5E7EB]">
                  <PanelLabel>Estado</PanelLabel>
                  {hay ? (
                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold mt-1 px-2 py-0.5 rounded-full ${
                      enCurso ? 'bg-[#ECFDF5] text-[#047857]' : u?.estado === 'finalizado' ? 'bg-[#10B981]/[0.09] text-[#14202B]' : 'bg-black/5 text-[#66686A]'
                    }`}>
                      {etiquetaEstado(u?.estado)}
                    </span>
                  ) : (
                    <PanelText className="font-semibold text-[#8A8C8E] mt-0.5">Sin recorridos</PanelText>
                  )}
                </div>
              </div>
              );
            })()}

            {infoTab === 'robot' && (() => {
              const robot = robots.find(x => x.label === currentBuilding.lastRobot);
              const hay = currentBuilding.relevamientos > 0 && currentBuilding.lastRobot !== '—';
              return (
              <div className="flex items-start">
                <div className="pr-8">
                  <PanelLabel>Identificación</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{hay ? currentBuilding.lastRobot : '—'}</PanelText>
                </div>
                <div className="px-8 border-l border-[#E5E7EB]">
                  <PanelLabel>Modelo</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{robot?.modelo || '—'}</PanelText>
                </div>
                <div className="pl-8 border-l border-[#E5E7EB]">
                  <PanelLabel>Conexión</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{robot?.conexion?.host ?? '—'}</PanelText>
                  {robot?.conexion?.interfaz && <p className="text-[11px] text-[#8A8C8E]">Interfaz {robot.conexion.interfaz}</p>}
                </div>
              </div>
              );
            })()}
            {infoTab === 'edificio' && (() => {
              const plantas = ficha?.pisos_sobre_pb ?? null;
              const sub = ficha?.subsuelos ?? 0;
              return (
              <div className="flex items-start">
                <div className="pr-8 min-w-0 max-w-[340px]">
                  <PanelLabel>Edificación</PanelLabel>
                  <PanelText className="font-semibold mt-0.5 truncate">{currentBuilding.name}</PanelText>
                  <p className="text-[11px] text-[#8A8C8E] truncate">{ficha?.direccion || currentBuilding.address || 'Sin dirección'}</p>
                </div>
                <div className="px-8 border-l border-[#E5E7EB]">
                  <PanelLabel>Tipo y destino</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{ficha?.tipo_propiedad ? etiquetaDe(TIPOS_PROPIEDAD, ficha.tipo_propiedad) : '—'}</PanelText>
                  <p className="text-[11px] text-[#8A8C8E]">{ficha?.destino ? etiquetaDe(DESTINOS, ficha.destino) : '\u00a0'}</p>
                </div>
                <div className="px-8 border-l border-[#E5E7EB]">
                  <PanelLabel>Año de construcción</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{ficha?.anio_construccion ?? (currentBuilding.yearBuilt || '—')}</PanelText>
                </div>
                <div className="px-8 border-l border-[#E5E7EB]">
                  <PanelLabel>Altura</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">
                    {plantas === null ? '—' : plantas === 0 ? 'Solo planta baja' : `PB + ${plantas} piso${plantas === 1 ? '' : 's'}`}
                  </PanelText>
                  <p className="text-[11px] text-[#8A8C8E]">{sub > 0 ? `${sub} subsuelo${sub === 1 ? '' : 's'}` : '\u00a0'}</p>
                </div>
                <div className="pl-8 border-l border-[#E5E7EB]">
                  <PanelLabel>Inspecciones</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">
                    {currentBuilding.relevamientos > 0 ? currentBuilding.relevamientos : 'Ninguna'}
                  </PanelText>
                </div>
              </div>
              );
            })()}
          </div>
        </div>
        </div>

        </div>
        </div>

      {borrando && currentBuilding.ultimoRelevamiento && (
        <DialogoConfirmar
          titulo="¿Eliminar esta inspección?"
          enviando={borrando.enviando}
          error={borrando.error}
          onConfirmar={eliminarInspeccion}
          onCerrar={() => setBorrando(null)}
        >
          Se borra la inspección del <b>{currentBuilding.lastRelevamientoDate}</b> ({horaLocal(currentBuilding.ultimoRelevamiento.inicio)})
          {currentBuilding.ultimoRelevamiento.planta ? `, ${currentBuilding.ultimoRelevamiento.planta}` : ''}, con
          {currentBuilding.lastDetections > 0 ? ` sus ${currentBuilding.lastDetections} hallazgo${currentBuilding.lastDetections === 1 ? '' : 's'},` : ''} el
          camino del robot y las revisiones. No se puede deshacer.
        </DialogoConfirmar>
      )}
      </div>
    </div>
  );
}
