import React, { useState } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { recentActivity, mockProjects } from './data';
import { TopNav, ProjectsSidebar } from './components';
import { Map, Settings, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Main ─────────────────────────────────────────────────────────────────────

interface HomeProps {
  onNavigateToFloorPlan: (buildingId: string) => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  selectedBuildingId?: string | null;
  onSelectBuilding?: (id: string) => void;
}

export default function Home({ onNavigateToFloorPlan, activeTab, onTabChange, selectedBuildingId, onSelectBuilding }: HomeProps) {
  const [activityOpen, setActivityOpen] = useState(true);

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

          {/* Main content — dashboard overview */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[860px] space-y-4">

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Edificios registrados', value: mockProjects.flatMap(p => p.buildings).length, color: '#11676A' },
                { label: 'Relevamientos totales', value: mockProjects.flatMap(p => p.buildings).reduce((s, b) => s + b.relevamientos, 0), color: '#11676A' },
                { label: 'Detecciones críticas activas', value: 3, color: '#EF4444' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] px-6 py-5">
                  <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest mb-2">{label}</p>
                  <p className="text-[32px] font-bold leading-none tracking-tight" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
              <button
                onClick={() => setActivityOpen(o => !o)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#FAFAF9] transition-colors rounded-t-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#11676A]" />
                  <span className="text-[13px] font-semibold text-[#2D2F31]">Actividad reciente</span>
                </div>
                {activityOpen
                  ? <ChevronUp className="w-4 h-4 text-[#8A8C8E]" />
                  : <ChevronDown className="w-4 h-4 text-[#8A8C8E]" />
                }
              </button>
              {activityOpen && (
                <div className="border-t border-[#F0EDE8]">
                  {recentActivity.map((item, i) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-4 px-6 py-4 ${
                        i < recentActivity.length - 1 ? 'border-b border-[#F8F7F5]' : ''
                      }`}
                    >
                      <div className="flex-none mt-0.5">
                        {item.type === 'relevamiento' && <Map className="w-4 h-4 text-[#11676A]" />}
                        {item.type === 'detection' && <AlertTriangle className="w-4 h-4 text-[#EF4444]" />}
                        {item.type === 'config' && <Settings className="w-4 h-4 text-[#8A8C8E]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#1A1C1E] leading-snug">{item.text}</p>
                        <p className="text-[11px] text-[#8A8C8E] mt-0.5">{item.detail}</p>
                      </div>
                      <span className="text-[11px] text-[#A0A2A4] flex-none whitespace-nowrap pt-0.5">{item.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>
        </div>
      </div>
    </div>
  );
}

