import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronsLeft, Plus, FolderPlus, Folder, FolderOpen, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { useProyectos } from '../proyectos';
import BuildingListItem from './BuildingListItem';
import type { NavTab } from '../ActivityBar';
import { editarElemento, eliminado, nuevoEdificioEn, nuevoProyecto, verProyecto } from '../navegacion';
import { eliminarEdificacion } from '../edificioForm';
import { eliminarProyecto } from '../proyectoForm';
import DialogoConfirmar from './DialogoConfirmar';

interface ProjectsSidebarProps {
  /** Currently highlighted building (drives the left-border active state) */
  selectedBuildingId: string | null;
  /** Called when user clicks a building row */
  onSelectBuilding: (id: string) => void;
  /**
   * Lo que se está creando en ese momento (se muestra resaltado en la lista):
   * un proyecto nuevo, o una edificación nueva dentro de su proyecto.
   */
  borrador?: { tipo: 'proyecto'; nombre: string } | { tipo: 'edificio'; nombre: string; proyectoId: string };
  /** Proyecto cuya ficha se está viendo (se resalta) */
  proyectoSeleccionado?: string | null;
}

/** Fila resaltada para lo que se está creando. */
function FilaBorrador({ texto, sangria }: { texto: string; sangria: boolean }) {
  return (
    <div className={`w-full flex items-center gap-1.5 h-[26px] ${sangria ? 'pl-[38px]' : 'pl-[22px]'} pr-3 bg-[#D6E6F5] outline outline-1 -outline-offset-1 outline-[#377DC0]`} aria-current="page">
      {sangria ? <Plus className="w-4 h-4 text-[#377DC0] flex-none" /> : <FolderPlus className="w-4 h-4 text-[#377DC0] flex-none" />}
      <span className="text-[13px] text-[#1A1C1E] truncate flex-1 italic">{texto}</span>
      <span className="flex-none text-[10px] font-semibold uppercase tracking-wide text-[#377DC0]">Nuevo</span>
    </div>
  );
}

/**
 * Collapsible left-panel project/building tree.
 * Manages its own collapsed/expanded state internally.
 * Renders building initials chips in collapsed mode.
 */
export default function ProjectsSidebar({
  selectedBuildingId,
  onSelectBuilding,
  borrador,
  proyectoSeleccionado,
}: ProjectsSidebarProps) {
  const { proyectos, cargando, error, recargar } = useProyectos();
  const [menuDe, setMenuDe] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<{ tipo: 'proyecto' | 'edificio'; id: string; nombre: string; edificios: number; inspecciones: number; enviando: boolean; error: string | null } | null>(null);

  async function confirmarEliminar() {
    if (!borrando) return;
    setBorrando({ ...borrando, enviando: true, error: null });
    const forzar = borrando.inspecciones > 0;
    const r = borrando.tipo === 'proyecto' ? await eliminarProyecto(borrando.id, forzar) : await eliminarEdificacion(borrando.id, forzar);
    if (r.ok) {
      await recargar();
      eliminado(borrando.tipo, borrando.id);
      setBorrando(null);
      return;
    }
    // Si la nube encontró inspecciones que la app no sabía, se pide la confirmación fuerte
    setBorrando(r.motivo === 'en_uso'
      ? { ...borrando, enviando: false, error: null, inspecciones: r.relevamientos }
      : { ...borrando, enviando: false, error: 'No se pudo eliminar. Revisá tu conexión e intentá de nuevo.' });
  }
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set<string>() /* proyectos cerrados; por defecto todos abiertos */
  );

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredProjects = proyectos
    .map(p => ({
      ...p,
      buildings: p.buildings.filter(
        b =>
          !query ||
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.address.toLowerCase().includes(query.toLowerCase()) ||
          p.name.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter(p => !query || p.buildings.length > 0);

  // ── Collapsed state ───────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="flex-none w-[36px] flex flex-col bg-[#F8F9FA] border-r border-[#E5E7EB] items-center py-1.5">
        <button
          onClick={() => setCollapsed(false)}
          title="Ver proyectos"
          className="w-7 h-7 flex-none flex items-center justify-center rounded-[4px] hover:bg-black/[0.07] text-[#616161]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  // ── Expanded state ────────────────────────────────────────────────────────
  return (
    <aside className="flex-none w-[280px] flex flex-col bg-[#F8F9FA] border-r border-[#E5E7EB] overflow-hidden">
      {/* Encabezado de la sección, con sus acciones */}
      <div className="flex-none h-9 pl-5 pr-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#616161] uppercase tracking-[0.08em]">Proyectos</span>
        <div className="flex items-center gap-0.5">
          <AccionIcono titulo="Nuevo proyecto" onClick={nuevoProyecto}><FolderPlus className="w-4 h-4" /></AccionIcono>
          <AccionIcono titulo="Ocultar el panel" onClick={() => setCollapsed(true)}><ChevronsLeft className="w-4 h-4" /></AccionIcono>
        </div>
      </div>
      <div className="flex-none px-3 pb-2">
        <div className="flex items-center gap-1.5 h-7 px-2 bg-white rounded-[3px] border border-[#D4D4D4] focus-within:border-[#377DC0] focus-within:outline focus-within:outline-1 focus-within:outline-[#377DC0]">
          <Search className="w-3.5 h-3.5 text-[#8A8C8E] flex-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar proyecto o edificación"
            className="bg-transparent text-[13px] text-[#1A1C1E] placeholder:text-[#8A8C8E] outline-none w-full min-w-0"
          />
        </div>
      </div>

      {/* Árbol de proyectos */}
      <div className="flex-1 overflow-y-auto pb-2">
        {cargando && <p className="px-5 py-2 text-[13px] text-[#8A8C8E]">Cargando…</p>}
        {error && <p className="px-5 py-2 text-[13px] text-[#991B1B]">{error}</p>}
        {!cargando && !error && proyectos.length === 0 && (
          <p className="px-5 py-2 text-[13px] text-[#8A8C8E]">Todavía no hay proyectos. Creá el primero con el ícono de carpeta de arriba.</p>
        )}
        {/* Proyecto que se está creando */}
        {borrador?.tipo === 'proyecto' && <FilaBorrador texto={borrador.nombre.trim() || 'Nuevo proyecto'} sangria={false} />}
        {/* Edificación nueva sin proyecto elegido todavía */}
        {borrador?.tipo === 'edificio' && !proyectos.some(p => p.id === borrador.proyectoId) && (
          <FilaBorrador texto={borrador.nombre.trim() || 'Nueva edificación'} sangria={false} />
        )}

        {/* Project rows */}
        {filteredProjects.map(project => {
          const conBorrador = borrador?.tipo === 'edificio' && borrador.proyectoId === project.id;
          const isOpen = conBorrador || !expandedProjects.has(project.id);
          return (
            <div key={project.id}>
              {/* Project header */}
              <div className={`group relative flex items-center h-[26px] ${
                proyectoSeleccionado === project.id ? 'bg-[#D6E6F5]' : 'hover:bg-black/[0.045]'
              }`}>
                {/* La flecha despliega; el nombre abre la ficha del proyecto */}
                <button
                  onClick={() => toggleProject(project.id)}
                  title={isOpen ? 'Plegar' : 'Desplegar'}
                  aria-label={`${isOpen ? 'Plegar' : 'Desplegar'} ${project.name}`}
                  className="flex-none h-full pl-1.5 pr-0.5 text-[#616161] hover:text-[#1A1C1E]"
                >
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => verProyecto(project.id)}
                  title={`Ver el proyecto ${project.name}`}
                  className="flex-1 min-w-0 h-full flex items-center gap-1.5 pr-2 text-left"
                >
                  {isOpen
                    ? <FolderOpen className="w-4 h-4 flex-none text-[#C09553]" />
                    : <Folder className="w-4 h-4 flex-none text-[#C09553]" />}
                  <span className="text-[13px] flex-1 truncate text-[#1A1C1E]">{project.name}</span>
                  <span className="text-[11px] text-[#8A8C8E] flex-none tabular-nums group-hover:hidden">{project.buildings.length}</span>
                </button>
                <button
                  onClick={() => nuevoEdificioEn(project.id)}
                  title="Nueva edificación"
                  aria-label={`Nueva edificación en ${project.name}`}
                  className="flex-none w-[22px] h-[22px] hidden group-hover:flex items-center justify-center rounded-[4px] text-[#424242] hover:bg-black/[0.08]"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMenuDe(m => (m === project.id ? null : project.id))}
                  title="Más opciones"
                  aria-label={`Más opciones de ${project.name}`}
                  aria-expanded={menuDe === project.id}
                  className={`flex-none mr-1.5 w-[22px] h-[22px] flex items-center justify-center rounded-[4px] text-[#424242] hover:bg-black/[0.08] ${
                    menuDe === project.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {menuDe === project.id && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMenuDe(null)} aria-hidden />
                    <div className="absolute right-2 top-full z-30 mt-1 w-[190px] rounded-[5px] bg-white border border-[#D4D4D4] shadow-[0_2px_8px_rgba(0,0,0,0.16)] p-1">
                      <button
                        onClick={() => { setMenuDe(null); editarElemento('proyecto', project.id); }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-left text-[13px] text-[#1A1C1E] hover:bg-[#377DC0] hover:text-white"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar proyecto
                      </button>
                      <button
                        onClick={() => {
                          setMenuDe(null);
                          setBorrando({ tipo: 'proyecto', id: project.id, nombre: project.name, edificios: project.buildings.length,
                            inspecciones: project.buildings.reduce((n, b) => n + b.relevamientos, 0), enviando: false, error: null });
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-left text-[13px] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar proyecto
                      </button>
                    </div>
                  </>
                )}
              </div>


              {/* Building rows */}
              <div className="relative">
              {isOpen && <span className="absolute left-[14px] top-0 bottom-0 w-px bg-black/[0.12] z-10 pointer-events-none" />}
              {conBorrador && <FilaBorrador texto={borrador.nombre.trim() || 'Nueva edificación'} sangria />}
              {isOpen && project.buildings.map(building => {
                const clave = `e-${building.id}`;
                return (
                  <div key={building.id} className="group relative">
                    <BuildingListItem
                      building={building}
                      isSelected={building.id === selectedBuildingId}
                      onClick={() => onSelectBuilding(building.id)}
                    />
                    <button
                      onClick={() => setMenuDe(m => (m === clave ? null : clave))}
                      title="Más opciones"
                      aria-label={`Más opciones de ${building.name}`}
                      aria-expanded={menuDe === clave}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-[22px] h-[22px] flex items-center justify-center rounded-[4px] text-[#424242] hover:bg-black/[0.08] ${
                        menuDe === clave ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                      }`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuDe === clave && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setMenuDe(null)} aria-hidden />
                        <div className="absolute right-2 top-full z-30 mt-1 w-[200px] rounded-[5px] bg-white border border-[#D4D4D4] shadow-[0_2px_8px_rgba(0,0,0,0.16)] p-1">
                          <button
                            onClick={() => { setMenuDe(null); editarElemento('edificio', building.id); }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-left text-[13px] text-[#1A1C1E] hover:bg-[#377DC0] hover:text-white"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar edificación
                          </button>
                          <button
                            onClick={() => {
                              setMenuDe(null);
                              setBorrando({ tipo: 'edificio', id: building.id, nombre: building.name, edificios: 0, inspecciones: building.relevamientos, enviando: false, error: null });
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-left text-[13px] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar edificación
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {/* Botón para sumar una edificación a este proyecto */}
              {isOpen && !conBorrador && (
                <button
                  onClick={() => nuevoEdificioEn(project.id)}
                  title={`Agregar una edificación a ${project.name}`}
                  className="w-full flex items-center gap-1.5 h-[26px] pl-[38px] pr-3 text-left text-[12px] text-[#377DC0] hover:bg-black/[0.045]"
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva edificación
                </button>
              )}
              </div>
            </div>
          );
        })}
      </div>

      {borrando && (
        <DialogoConfirmar
          titulo={borrando.tipo === 'proyecto' ? `¿Eliminar el proyecto ${borrando.nombre}?` : `¿Eliminar ${borrando.nombre}?`}
          enviando={borrando.enviando}
          error={borrando.error}
          escribir={borrando.inspecciones > 0 ? borrando.nombre : undefined}
          onConfirmar={confirmarEliminar}
          onCerrar={() => setBorrando(null)}
        >
          {borrando.tipo === 'edificio'
            ? 'Se borran su ficha y sus documentos. '
            : borrando.edificios > 0
              ? `También se borran sus ${borrando.edificios} edificaci${borrando.edificios === 1 ? 'ón' : 'ones'} con sus documentos. `
              : 'El proyecto no tiene edificaciones. '}
          {borrando.inspecciones > 0 && (
            <>Además se borran para siempre <b className="text-[#991B1B]">{borrando.inspecciones} inspección{borrando.inspecciones === 1 ? '' : 'es'}</b> con sus hallazgos e informes. </>
          )}
          No se puede deshacer.
        </DialogoConfirmar>
      )}
    </aside>
  );
}

function AccionIcono({ titulo, onClick, children }: { titulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={titulo} aria-label={titulo}
      className="w-[22px] h-[22px] flex items-center justify-center rounded-[4px] text-[#424242] hover:bg-black/[0.08]">
      {children}
    </button>
  );
}
