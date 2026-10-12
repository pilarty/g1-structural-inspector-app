import React, { useState } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, TurquoiseCard, PanelTitle, PanelLabel, PrimaryButton, SecondaryButton } from './components';
import { useProyectos } from './proyectos';
import { useRobots } from './robots';
import { BACKEND_URL } from './sesion';
import { ChevronDown, Check } from 'lucide-react';

type RobotStatus = 'listo' | 'espera' | 'desconectado';

interface RobotOption {
  id: string;
  label: string;
  status: RobotStatus;
  battery: number;
  sensorsOk: boolean;
  network: string | null; // null = sin conexión
  configured: boolean; // conexión (red, SSH y DDS) ya configurada desde "Añadir robot"
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function fechaHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function horaAhora() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const ROBOT_VACIO: RobotOption = {
  id: '', label: 'Sin robots registrados', status: 'desconectado',
  battery: 0, sensorsOk: false, network: null, configured: false,
};

// Lista de ejemplo, ya no se usa: los robots vienen de AWS (useRobots).
const robotsDeEjemplo: RobotOption[] = [
  { id: 'HR-04', label: 'HR-04 / Unidad 2', status: 'listo',        battery: 84, sensorsOk: true,  network: 'Red_Obra_01', configured: true },
  { id: 'HR-02', label: 'HR-02 / Unidad 1', status: 'espera',       battery: 61, sensorsOk: true,  network: 'Red_Obra_01', configured: true },
  { id: 'HR-01', label: 'HR-01 / Unidad 3', status: 'desconectado', battery: 12, sensorsOk: false, network: null,          configured: false },
];

// Los edificios ahora vienen de AWS (useProyectos), dentro del componente.

interface InspectionSetupProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export default function InspectionSetup({ activeTab, onTabChange }: InspectionSetupProps) {
  const { proyectos } = useProyectos();
  const buildings = proyectos.flatMap(p => p.buildings);
  const { robots: robotsNube } = useRobots();
  const robots: RobotOption[] = robotsNube.map(r => ({
    id: r.id,
    label: r.label,
    status: r.estado === 'activo' ? 'listo' : 'desconectado',
    battery: 0,
    sensorsOk: true,
    network: null,
    configured: r.configured,
  }));
  const [selectedRobotId, setSelectedRobotId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildings[0]?.id);
  const [date, setDate] = useState(fechaHoy);
  const [time, setTime] = useState(horaAhora);
  const [robotMenuOpen, setRobotMenuOpen] = useState(false);
  const [buildingMenuOpen, setBuildingMenuOpen] = useState(false);

  const robot = robots.find(r => r.id === selectedRobotId) ?? robots[0] ?? ROBOT_VACIO;
  const building = buildings.find(b => b.id === selectedBuildingId) ?? buildings[0];
  const canStart = robot.status === 'listo' && robot.configured;
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function iniciar() {
    if (!canStart || !building || iniciando) return;
    setIniciando(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/nube/relevamientos/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edificacion_id: Number(building.id),
          robot_id: Number(robot.id),
          fecha_programada: date && time ? new Date(`${date}T${time}`).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      onTabChange('inspeccion-en-curso');
    } catch {
      setError('No se pudo iniciar la inspección. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setIniciando(false);
    }
  }

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">

        <TopNav />

        {/* Content area */}
        <div className="flex-1 overflow-y-auto bg-[#FFFFFF]">
          <div className="w-full px-8 py-10">

            {/* Page header */}
            <div className="mb-6">
              <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight leading-tight">Iniciar inspección</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1">Elegí el edificio y el robot, y confirmá que esté listo para comenzar.</p>
            </div>

            {/* ── Card: Configuración del relevamiento ── */}
            <TurquoiseCard size="lg" bordered className="w-full">
              <div className="px-5 pt-4 pb-3 border-b border-[#377DC0]/10">
                <PanelTitle>Configuración del relevamiento</PanelTitle>
              </div>

              <div className="px-5 py-5 grid grid-cols-2 gap-x-5 gap-y-4 items-start">

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
                              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#FFFFFF] transition-colors text-left"
                            >
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-[#1A1C1E] truncate">{b.name}</p>
                                <p className="text-[11px] text-[#8A8C8E] truncate">{b.address}</p>
                              </div>
                              {b.id === building?.id && <Check className="w-3.5 h-3.5 text-[#377DC0] flex-none" />}
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
                              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 hover:bg-[#FFFFFF] transition-colors text-left"
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <span className="text-[12px] font-semibold text-[#1A1C1E] truncate">{r.label}</span>
                              </span>
                              {r.id === robot.id && <Check className="w-3.5 h-3.5 text-[#377DC0] flex-none" />}
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
                disabled={!canStart || !building || iniciando}
                onClick={iniciar}
              >
                {iniciando ? 'Iniciando…' : 'Iniciar inspección'}
              </PrimaryButton>
              {error && <p className="text-[11px] text-[#991B1B] mt-2">{error}</p>}
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
