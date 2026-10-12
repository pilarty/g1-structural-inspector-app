import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import { useProyectos } from '../proyectos';
import BuildingListItem from './BuildingListItem';
import type { NavTab } from '../ActivityBar';

interface ProjectsSidebarProps {
  /** Currently highlighted building (drives the left-border active state) */
  selectedBuildingId: string | null;
  /** Called when user clicks a building row */
  onSelectBuilding: (id: string) => void;
  /** Called when user clicks "+ Nuevo" */
  onNewBuilding: () => void;
}

/**
 * Collapsible left-panel project/building tree.
 * Manages its own collapsed/expanded state internally.
 * Renders building initials chips in collapsed mode.
 */
export default function ProjectsSidebar({
  selectedBuildingId,
  onSelectBuilding,
  onNewBuilding,
}: ProjectsSidebarProps) {
  const { proyectos, cargando, error } = useProyectos();
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
      <aside className="flex-none w-[44px] flex flex-col bg-white border-r border-[#EDEBE6] items-center py-3">
        <button
          onClick={() => setCollapsed(false)}
          title="Ver edificios"
          className="w-8 h-8 flex-none flex items-center justify-center rounded-full hover:bg-[#FFFFFF] transition-colors text-[#8A8C8E] hover:text-[#377DC0]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  // ── Expanded state ────────────────────────────────────────────────────────
  return (
    <aside className="flex-none w-[264px] flex flex-col bg-white border-r border-[#EDEBE6] overflow-hidden">
      {/* Search + collapse */}
      <div className="px-3 py-3 border-b border-[#EDEBE6] flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#FFFFFF] rounded-xl border border-[#E8E5DF] focus-within:border-[#377DC0]/40 transition-colors flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-[#8A8C8E] flex-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar proyecto o edificio"
            className="bg-transparent text-[12px] text-[#1A1C1E] placeholder:text-[#8A8C8E] outline-none w-full min-w-0"
          />
        </div>
        <button
          onClick={() => setCollapsed(true)}
          title="Colapsar panel"
          className="flex-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#FFFFFF] transition-colors text-[#8A8C8E]"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Project tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Section header */}
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[#8A8C8E] uppercase tracking-widest">
            Proyectos
          </span>
          <button
            onClick={onNewBuilding}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#377DC0] hover:opacity-70 transition-opacity"
          >
            <Plus className="w-3 h-3" />
            Nuevo
          </button>
        </div>

        {cargando && <p className="px-4 py-3 text-[12px] text-[#8A8C8E]">Cargando…</p>}
        {error && <p className="px-4 py-3 text-[12px] text-[#991B1B]">{error}</p>}
        {!cargando && !error && proyectos.length === 0 && (
          <p className="px-4 py-3 text-[12px] text-[#8A8C8E]">Todavía no hay proyectos. Crea el primero con «Nuevo proyecto».</p>
        )}
        {/* Project rows */}
        {filteredProjects.map(project => {
          const isOpen = !expandedProjects.has(project.id);
          return (
            <div key={project.id}>
              {/* Project header */}
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#F8F7F5] transition-colors text-left"
              >
                {isOpen
                  ? <ChevronDown className="w-3 h-3 text-[#8A8C8E] flex-none" />
                  : <ChevronRight className="w-3 h-3 text-[#8A8C8E] flex-none" />
                }
                <span className="text-[12px] font-medium text-[#2D2F31] flex-1 truncate leading-snug">
                  {project.name}
                </span>
                <span className="text-[11px] font-medium text-[#8A8C8E] flex-none tabular-nums">
                  {project.buildings.length}
                </span>
              </button>

              {/* Building rows */}
              {isOpen && project.buildings.map(building => (
                <BuildingListItem
                  key={building.id}
                  building={building}
                  isSelected={building.id === selectedBuildingId}
                  onClick={() => onSelectBuilding(building.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
