import React from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, ProjectsSidebar } from './components';
import { Plus } from 'lucide-react';

// ─── Main ─────────────────────────────────────────────────────────────────────

interface HomeProps {
  onNavigateToFloorPlan: (buildingId: string) => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  selectedBuildingId?: string | null;
  onSelectBuilding?: (id: string) => void;
}

export default function Home({ onNavigateToFloorPlan, activeTab, onTabChange, selectedBuildingId, onSelectBuilding }: HomeProps) {
  return (
    <div className="flex h-screen bg-[#F3F1ED] font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={tab => { onTabChange(tab); if (tab === 'relevamiento') onNavigateToFloorPlan(''); }} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />

        <div className="flex flex-1 overflow-hidden">
          <ProjectsSidebar
            selectedBuildingId={selectedBuildingId ?? null}
            onSelectBuilding={id => onSelectBuilding?.(id)}
            onNewBuilding={() => onTabChange('nuevo-edificio')}
          />

          {/* Main content */}
          <main className="flex-1 flex items-center justify-center bg-[#F3F1ED]">
            {!selectedBuildingId && (
              <div className="flex flex-col items-center text-center bg-white/50 backdrop-blur-sm border border-white/70 rounded-2xl px-12 py-11 max-w-[380px]">
                <p className="text-[15px] font-semibold text-[#1A1C1E] mb-1.5">
                  Ningún edificio seleccionado
                </p>
                <p className="text-[13px] text-[#8A8C8E] mb-6 leading-relaxed">
                  Seleccioná un edificio o proyecto para visualizar
                </p>
                <button
                  onClick={() => onTabChange('nuevo-edificio')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#11676A] hover:bg-[#0E5254] text-white font-semibold text-[13px] rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(17,103,106,0.3)]"
                >
                  <Plus className="w-4 h-4" />
                  Crear edificio
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
