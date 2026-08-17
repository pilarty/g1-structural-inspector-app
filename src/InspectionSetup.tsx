import React, { useState } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, TurquoiseCard, PanelTitle, PanelLabel, PrimaryButton, SecondaryButton } from './components';
import { mockProjects } from './data';
import { ChevronDown, Check } from 'lucide-react';

type RobotStatus = 'listo' | 'espera' | 'desconectado';

const statusConfig: Record<RobotStatus, { label: string; dot: string }> = {
  listo:        { label: 'Listo',               dot: '#10B981' },
  espera:       { label: 'Conectado en espera', dot: '#FBBF24' },
  desconectado: { label: 'Desconectado',        dot: '#EF4444' },
};

interface RobotOption {
  id: string;
  label: string;
  status: RobotStatus;
  battery: number;
  sensorsOk: boolean;
  network: string | null; // null = sin conexión
  configured: boolean; // conexión (LAN/SSH/Webserver/ROS2) ya configurada desde "Añadir robot"
}

const robots: RobotOption[] = [
  { id: 'HR-04', label: 'HR-04 / Unidad 2', status: 'listo',        battery: 84, sensorsOk: true,  network: 'Red_Obra_01', configured: true },
  { id: 'HR-02', label: 'HR-02 / Unidad 1', status: 'espera',       battery: 61, sensorsOk: true,  network: 'Red_Obra_01', configured: true },
  { id: 'HR-01', label: 'HR-01 / Unidad 3', status: 'desconectado', battery: 12, sensorsOk: false, network: null,          configured: false },
];

const buildings = mockProjects.flatMap(p => p.buildings);

interface InspectionSetupProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export default function InspectionSetup({ activeTab, onTabChange }: InspectionSetupProps) {
  const [selectedRobotId, setSelectedRobotId] = useState(robots[0].id);
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildings[0]?.id);
  const [date, setDate] = useState('2026-08-15');
  const [time, setTime] = useState('09:00');
  const [robotMenuOpen, setRobotMenuOpen] = useState(false);
  const [buildingMenuOpen, setBuildingMenuOpen] = useState(false);

  const robot = robots.find(r => r.id === selectedRobotId) ?? robots[0];
  const building = buildings.find(b => b.id === selectedBuildingId) ?? buildings[0];
  const status = statusConfig[robot.status];
  const canStart = robot.status === 'listo' && robot.configured;

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">

        <TopNav />

        {/* Content area */}
        <div className="flex-1 overflow-y-auto bg-[#F3F1ED]">
          <div className="w-full px-8 py-10">

            {/* Page header */}
            <div className="mb-6">
              <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight leading-tight">Iniciar inspección</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1">Elegí el edificio y el robot, y confirmá que esté listo para comenzar.</p>
            </div>

            {/* ── Card: Configuración del relevamiento ── */}
            <TurquoiseCard size="lg" bordered className="w-full">
              <div className="px-5 pt-4 pb-3 border-b border-[#1B6E77]/10">
                <PanelTitle>Configuración del relevamiento</PanelTitle>
              </div>

              <div className="px-5 py-5 grid grid-cols-4 gap-x-5 gap-y-4 items-start">

                  {/* Building selector */}
                  <div className="relative">
                    <PanelLabel className="mb-1.5">Edificio</PanelLabel>
                    <button
                      onClick={() => { setBuildingMenuOpen(o => !o); setRobotMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-white/60 hover:bg-white/80 transition-colors rounded-xl text-left"
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-[#1A1C1E]">{building?.name}</p>
                        <p className="text-[11px] text-[#8A8C8E] mt-0.5">{building?.address}</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-[#8A8C8E] flex-none ml-3 transition-transform ${buildingMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {buildingMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setBuildingMenuOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden z-20 max-h-64 overflow-y-auto">
                          {buildings.map(b => (
                            <button
                              key={b.id}
                              onClick={() => { setSelectedBuildingId(b.id); setBuildingMenuOpen(false); }}
                              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#F3F1ED] transition-colors text-left"
                            >
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-[#1A1C1E] truncate">{b.name}</p>
                                <p className="text-[11px] text-[#8A8C8E] truncate">{b.address}</p>
                              </div>
                              {b.id === selectedBuildingId && <Check className="w-3.5 h-3.5 text-[#1B6E77] flex-none" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Robot selector */}
                  <div className="relative">
                    <PanelLabel className="mb-1.5">Robot asignado</PanelLabel>
                    <button
                      onClick={() => { setRobotMenuOpen(o => !o); setBuildingMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-white/60 hover:bg-white/80 transition-colors rounded-xl text-left"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: status.dot }} />
                        <span className="text-[13px] font-semibold text-[#1A1C1E] truncate">{robot.label}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#8A8C8E] flex-none ml-3 transition-transform ${robotMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {robotMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setRobotMenuOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden z-20">
                          {robots.map(r => (
                            <button
                              key={r.id}
                              onClick={() => { setSelectedRobotId(r.id); setRobotMenuOpen(false); }}
                              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 hover:bg-[#F3F1ED] transition-colors text-left"
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: statusConfig[r.status].dot }} />
                                <span className="text-[12px] font-semibold text-[#1A1C1E] truncate">{r.label}</span>
                              </span>
                              {r.id === selectedRobotId && <Check className="w-3.5 h-3.5 text-[#1B6E77] flex-none" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    <PanelLabel className="mb-1.5">Fecha</PanelLabel>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl h-[42px] text-[12px] font-semibold text-[#1A1C1E] outline-none transition-colors"
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <PanelLabel className="mb-1.5">Hora</PanelLabel>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl h-[42px] text-[12px] font-semibold text-[#1A1C1E] outline-none transition-colors"
                    />
                  </div>

              </div>

              {/* Estado de configuración del robot elegido */}
              <div className="mx-5 mb-5 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-black/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: robot.configured ? '#10B981' : '#EF4444' }} />
                  <span className="text-[12px] font-semibold text-[#1A1C1E]">
                    {robot.configured ? 'Conexión configurada' : 'Conexión sin configurar'}
                  </span>
                </div>
                <SecondaryButton onClick={() => onTabChange('nuevo-robot')}>
                  {robot.configured ? 'Editar configuración' : 'Configurar robot'}
                </SecondaryButton>
              </div>
            </TurquoiseCard>

            {/* Primary action — always last, after every field is visible */}
            <div className="max-w-[420px] mt-6">
              <PrimaryButton
                variant="full"
                disabled={!canStart}
                onClick={() => canStart && onTabChange('inspeccion-en-curso')}
              >
                Iniciar configuración
              </PrimaryButton>
              {!canStart && (
                <p className="text-[11px] text-[#991B1B] mt-2">
                  {robot.status !== 'listo'
                    ? 'El robot debe estar en estado "Listo" para iniciar.'
                    : 'Configurá la conexión del robot para continuar.'}
                </p>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
