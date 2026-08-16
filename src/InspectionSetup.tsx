import React, { useState } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav } from './components';
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
}

const robots: RobotOption[] = [
  { id: 'HR-04', label: 'HR-04 / Unidad 2', status: 'listo',        battery: 84, sensorsOk: true,  network: 'Red_Obra_01' },
  { id: 'HR-02', label: 'HR-02 / Unidad 1', status: 'espera',       battery: 61, sensorsOk: true,  network: 'Red_Obra_01' },
  { id: 'HR-01', label: 'HR-01 / Unidad 3', status: 'desconectado', battery: 12, sensorsOk: false, network: null },
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
  const canStart = robot.status === 'listo';

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">

        <TopNav />

        {/* Content area */}
        <div className="flex-1 overflow-y-auto bg-[#F3F1ED]">
          <div className="max-w-[720px] px-8 py-10">

            {/* Page header */}
            <div className="mb-8">
              <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight leading-tight">Iniciar inspección</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1">Verificá el estado del robot y configurá los parámetros antes de comenzar.</p>
            </div>

            {/* ── Section: Estado del robot ── */}
            <section>
              <div className="flex items-center justify-between pb-3 border-b border-[#11676A]/15">
                <h2 className="text-[14px] font-bold text-[#1A1C1E]">Estado del robot</h2>
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1A1C1E]">
                  <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: status.dot }} />
                  {status.label}
                </span>
              </div>

              <div className="py-5 space-y-5">

                {/* Robot ID + battery */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-normal text-[#0B5559] uppercase tracking-widest mb-1">Robot</p>
                    <p className="text-[13px] font-semibold text-[#1A1C1E]">{robot.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-normal text-[#0B5559] uppercase tracking-widest mb-1">Batería</p>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-black/8 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${robot.battery}%`, backgroundColor: robot.battery > 30 ? '#10B981' : '#EF4444' }}
                        />
                      </div>
                      <span className="text-[12px] font-semibold text-[#1A1C1E]">{robot.battery}%</span>
                    </div>
                  </div>
                </div>

                {/* Sensor rows */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    { label: 'Cámara de profundidad' },
                    { label: 'LiDAR 3D' },
                  ].map(sensor => (
                    <div key={sensor.label} className="flex items-center justify-between">
                      <span className="text-[12px] text-[#1A1C1E]">{sensor.label}</span>
                      <span className={`text-[11px] font-semibold ${robot.sensorsOk ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {robot.sensorsOk ? 'OK' : 'Sin señal'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Network */}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-normal text-[#0B5559] uppercase tracking-widest">Red</span>
                  {robot.network ? (
                    <p className="text-[12px] text-[#1A1C1E]">
                      WiFi 6 — <span className="font-semibold">{robot.network}</span>
                    </p>
                  ) : (
                    <p className="text-[12px] font-semibold text-[#EF4444]">Sin conexión de red detectada</p>
                  )}
                </div>

                {/* Warning — disconnected only */}
                {robot.status === 'desconectado' && (
                  <div className="flex items-center justify-between px-3.5 py-3 bg-[#FEF2F2] rounded-xl">
                    <span className="text-[11px] font-medium text-[#991B1B]">Robot no detectado en la red.</span>
                    <button
                      onClick={() => {}}
                      className="text-[11px] font-semibold text-[#11676A] hover:opacity-70 transition-opacity whitespace-nowrap"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ── Section: Configuración del relevamiento ── */}
            <section className="mt-2">
              <div className="pb-3 border-b border-[#11676A]/15">
                <h2 className="text-[14px] font-bold text-[#1A1C1E]">Configuración del relevamiento</h2>
              </div>

              <div className="py-5 space-y-4">

                {/* Building selector */}
                <div className="relative">
                  <p className="text-[9px] font-normal text-[#0B5559] uppercase tracking-widest mb-1.5">Edificio</p>
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
                            {b.id === selectedBuildingId && <Check className="w-3.5 h-3.5 text-[#11676A] flex-none" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Robot selector */}
                  <div className="col-span-1 relative">
                    <p className="text-[9px] font-normal text-[#0B5559] uppercase tracking-widest mb-1.5">Robot asignado</p>
                    <button
                      onClick={() => { setRobotMenuOpen(o => !o); setBuildingMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-white/40 hover:bg-white/70 transition-colors rounded-xl h-[42px]"
                    >
                      <span className="text-[12px] font-semibold text-[#1A1C1E] truncate">{robot.id}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-[#8A8C8E] flex-none transition-transform ${robotMenuOpen ? 'rotate-180' : ''}`} />
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
                                <span className="text-[12px] font-semibold text-[#1A1C1E] truncate">{r.id}</span>
                              </span>
                              {r.id === selectedRobotId && <Check className="w-3.5 h-3.5 text-[#11676A] flex-none" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Date */}
                  <div className="col-span-1">
                    <p className="text-[9px] font-normal text-[#0B5559] uppercase tracking-widest mb-1.5">Fecha</p>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl h-[42px] text-[12px] font-semibold text-[#1A1C1E] outline-none transition-colors"
                    />
                  </div>

                  {/* Time */}
                  <div className="col-span-1">
                    <p className="text-[9px] font-normal text-[#0B5559] uppercase tracking-widest mb-1.5">Hora</p>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl h-[42px] text-[12px] font-semibold text-[#1A1C1E] outline-none transition-colors"
                    />
                  </div>
                </div>

              </div>
            </section>

            {/* Primary action */}
            <button
              disabled={!canStart}
              onClick={() => canStart && onTabChange('inspeccion-en-curso')}
              className={`w-full mt-6 py-3.5 rounded-xl text-[14px] font-semibold transition-colors ${
                canStart
                  ? 'bg-[#11676A] text-white hover:bg-[#0E5254]'
                  : 'bg-[#E2DFD8] text-[#A0A2A4] cursor-not-allowed'
              }`}
            >
              Iniciar configuración
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
