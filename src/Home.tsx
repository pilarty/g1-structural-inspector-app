import React from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, ProjectsSidebar, TurquoiseCard, PrimaryButton } from './components';
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
            <TurquoiseCard size="lg" bordered className="flex flex-col items-center text-center px-12 py-11 max-w-[380px]">
              <p className="text-[15px] font-semibold text-[#1A1C1E] mb-1.5">
                Ningún edificio seleccionado
              </p>
              <p className="text-[13px] text-[#8A8C8E] mb-6 leading-relaxed">
                Seleccioná un edificio del panel izquierdo para ver su recorrido
              </p>
              <PrimaryButton icon={<Plus className="w-4 h-4" />} onClick={() => onTabChange('nuevo-edificio')}>
                Crear edificio
              </PrimaryButton>
            </TurquoiseCard>
          </main>
        </div>
      </div>
    </div>
  );
}
