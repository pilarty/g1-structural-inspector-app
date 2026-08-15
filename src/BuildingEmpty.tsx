import React from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav } from './components';
import { MapPin, Layers, Calendar, Map, Settings, Download, Play } from 'lucide-react';

const GRID_BG = {
  backgroundColor: '#F3F1ED',
  backgroundImage: `linear-gradient(rgba(229,231,235,0.17) 1px, transparent 1px), linear-gradient(90deg, rgba(229,231,235,0.17) 1px, transparent 1px)`,
  backgroundSize: '22px 22px',
} as const;

interface BuildingEmptyProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onStartInspection: () => void;
}

export default function BuildingEmpty({ activeTab, onTabChange, onStartInspection }: BuildingEmptyProps) {
  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">

        <TopNav />

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={GRID_BG}>
          <div className="p-6 max-w-[900px] space-y-4">

            {/* Hero card — identical to BuildingDetail */}
            <div className="rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
              <div className="bg-[#11676A] px-8 py-8 flex items-start justify-between gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.12em]">Edificio</span>
                    <span className="text-[10px] font-semibold text-white/50 border border-white/20 px-2 py-0.5 rounded-md">Sin plano</span>
                  </div>
                  <h1 className="text-[24px] font-bold text-white leading-tight tracking-tight mb-2">
                    Torre Libertador 4500
                  </h1>
                  <p className="text-[13px] text-white/60 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-none" />
                    Av. del Libertador 4500, Palermo
                  </p>
                  <div className="flex items-center gap-5 mt-5">
                    <div className="flex items-center gap-1.5 text-white/55">
                      <Layers className="w-3.5 h-3.5" />
                      <span className="text-[12px]">22 plantas</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/55">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[12px]">Construido 2003</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 flex-none">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white/50 text-[13px] font-semibold rounded-xl border border-white/15 cursor-not-allowed">
                    <Map className="w-3.5 h-3.5" />
                    Ver plano
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white text-[13px] font-medium rounded-xl hover:bg-white/20 transition-colors border border-white/15">
                    <Settings className="w-3.5 h-3.5" />
                    Configurar
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white/40 text-[13px] font-medium rounded-xl border border-white/10 cursor-not-allowed">
                    <Download className="w-3.5 h-3.5" />
                    Exportar informe
                  </button>
                </div>
              </div>
            </div>

            {/* Empty state block */}
            <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] flex flex-col items-center justify-center py-16 px-8 text-center">


              <h2 className="text-[17px] font-bold text-[#1A1C1E] tracking-tight mb-2">
                Este edificio todavía no tiene relevamientos
              </h2>
              <p className="text-[13px] text-[#8A8C8E] max-w-[340px] leading-relaxed mb-8">
                Iniciá una inspección para comenzar a recolectar datos estructurales y detectar daños en tiempo real.
              </p>

              <button
                onClick={onStartInspection}
                className="flex items-center gap-2 px-7 py-3 bg-[#11676A] hover:bg-[#0E5254] text-white text-[14px] font-semibold rounded-xl transition-colors shadow-[0_2px_12px_rgba(17,103,106,0.3)]"
              >
                <Play className="w-4 h-4" />
                Iniciar inspección
              </button>

              <p className="text-[11px] text-[#A0A2A4] mt-5">
                Necesitás tener un robot conectado y el plano configurado antes de comenzar.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
