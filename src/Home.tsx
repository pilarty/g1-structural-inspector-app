import React from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, ProjectsSidebar, TurquoiseCard, PanelLabel, PanelText, PrimaryButton, SeverityBadge } from './components';
import { mockProjects } from './data';
import { Plus, ArrowRight } from 'lucide-react';

// ─── Main ─────────────────────────────────────────────────────────────────────

interface HomeProps {
  onNavigateToFloorPlan: (buildingId: string) => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  selectedBuildingId?: string | null;
  onSelectBuilding?: (id: string) => void;
  onViewRecorrido?: () => void;
}

export default function Home({ onNavigateToFloorPlan, activeTab, onTabChange, selectedBuildingId, onSelectBuilding, onViewRecorrido }: HomeProps) {
  const building = selectedBuildingId
    ? mockProjects.flatMap(p => p.buildings).find(b => b.id === selectedBuildingId)
    : null;

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
            {!building && (
              <TurquoiseCard size="lg" bordered className="flex flex-col items-center text-center px-12 py-11 max-w-[380px]">
                <p className="text-[15px] font-semibold text-[#1A1C1E] mb-1.5">
                  Ningún edificio seleccionado
                </p>
                <p className="text-[13px] text-[#8A8C8E] mb-6 leading-relaxed">
                  Seleccioná un edificio o proyecto para visualizar
                </p>
                <PrimaryButton icon={<Plus className="w-4 h-4" />} onClick={() => onTabChange('nuevo-edificio')}>
                  Crear edificio
                </PrimaryButton>
              </TurquoiseCard>
            )}

            {building && (
              <TurquoiseCard size="lg" bordered className="px-9 py-8 max-w-[460px] w-full mx-6">
                <p className="text-[16px] font-bold text-[#1A1C1E]">{building.name}</p>
                <p className="text-[13px] text-[#8A8C8E] mt-0.5">{building.address}</p>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6 pt-6 border-t border-[#11676A]/10">
                  <div>
                    <PanelLabel>Plantas</PanelLabel>
                    <PanelText className="mt-0.5 font-semibold">{building.floors}</PanelText>
                  </div>
                  <div>
                    <PanelLabel>Año</PanelLabel>
                    <PanelText className="mt-0.5 font-semibold">{building.yearBuilt}</PanelText>
                  </div>
                  <div>
                    <PanelLabel>Relevamientos</PanelLabel>
                    <PanelText className="mt-0.5 font-semibold">
                      {building.relevamientos > 0 ? building.relevamientos : 'Sin relevamientos'}
                    </PanelText>
                  </div>
                  <div>
                    <PanelLabel>Severidad máxima</PanelLabel>
                    <div className="mt-0.5">
                      {building.relevamientos > 0 ? (
                        <SeverityBadge level={building.highestSeverity} />
                      ) : (
                        <PanelText className="font-semibold text-[#8A8C8E]">—</PanelText>
                      )}
                    </div>
                  </div>
                </div>

                <PrimaryButton
                  variant="full"
                  onClick={() => onViewRecorrido?.()}
                  iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                  className="mt-7"
                >
                  Ver recorrido
                </PrimaryButton>
              </TurquoiseCard>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
