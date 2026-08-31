import React from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, ProjectsSidebar, PrimaryButton, SecondaryButton } from './components';
import { Plus, FolderPlus } from 'lucide-react';

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
            <div className="flex flex-col items-center text-center max-w-[440px]">
              <p className="text-[24px] font-bold text-[#1A1C1E] mb-2.5 tracking-tight">
                Ningún edificio seleccionado
              </p>
              <p className="text-[16px] text-[#8A8C8E] mb-8 leading-relaxed">
                Seleccioná un edificio del panel izquierdo para ver su recorrido
              </p>
              <div className="flex items-center gap-3">
                <PrimaryButton icon={<Plus className="w-4 h-4" />} onClick={() => onTabChange('nuevo-edificio')}>
                  Crear edificio
                </PrimaryButton>
                <SecondaryButton variant="outline" icon={<FolderPlus className="w-4 h-4" />} onClick={() => onTabChange('nuevo-proyecto')}>
                  Crear proyecto
                </SecondaryButton>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
