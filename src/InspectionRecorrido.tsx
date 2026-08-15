import React, { useState } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { mockProjects, Building } from './data';
import { TopNav, ProjectsSidebar } from './components';
import {
  CheckCircle2, Clock, Map, Bot,
  ZoomIn, ZoomOut, Maximize, ArrowRight,
} from 'lucide-react';

const GRID_BG = {
  backgroundColor: '#FFFFFF',
  backgroundImage: `linear-gradient(rgba(229,231,235,0.17) 1px, transparent 1px), linear-gradient(90deg, rgba(229,231,235,0.17) 1px, transparent 1px)`,
  backgroundSize: '22px 22px',
} as const;

// Full floor-plan trajectory in 800×600 viewBox space
const TRAJ_POINTS: [number, number][] = [
  [144, 210], [144, 132], [250, 132], [370, 132],
  [370, 200], [440, 200], [440, 132], [578, 132],
  [578, 240], [450, 240], [450, 348], [376, 348],
  [376, 440], [520, 440], [578, 440], [578, 340],
];
const START    = TRAJ_POINTS[0];
const END      = TRAJ_POINTS[TRAJ_POINTS.length - 1];
const trajStr  = TRAJ_POINTS.map(([x, y]) => `${x},${y}`).join(' ');

// Default to first building that has relevamientos
const defaultBuilding =
  mockProjects.flatMap(p => p.buildings).find(b => b.relevamientos > 0)!;

type TabId = 'datos' | 'robot' | 'operador' | 'edificio';

interface InspectionRecorridoProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onViewDetails: () => void;
}

export default function InspectionRecorrido({ activeTab, onTabChange, onViewDetails }: InspectionRecorridoProps) {
  const [infoTab, setInfoTab] = useState<TabId>('datos');
  const [currentBuildingId, setCurrentBuildingId] = useState(defaultBuilding.id);

  const currentBuilding: Building =
    mockProjects.flatMap(p => p.buildings).find(b => b.id === currentBuildingId) ?? defaultBuilding;

  const infoTabs: { id: TabId; label: string }[] = [
    { id: 'datos',    label: 'Datos del recorrido' },
    { id: 'robot',    label: 'Robot' },
    { id: 'operador', label: 'Operador' },
    { id: 'edificio', label: 'Edificio' },
  ];

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />
      <ProjectsSidebar
        selectedBuildingId={currentBuildingId}
        onSelectBuilding={setCurrentBuildingId}
        onNewBuilding={() => onTabChange('nuevo-edificio')}
      />

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav
          badge={
            <span className="ml-3 text-[11px] font-semibold text-white/50 bg-white/10 px-2.5 py-0.5 rounded-md truncate">
              {currentBuilding.name}
            </span>
          }
        />

        {/* Stats row */}
        <div className="flex-none bg-white border-b border-[#EDEBE6] px-4 py-3 flex items-center">
          {([
            {
              Icon: CheckCircle2,
              label: 'Estado',
              value: currentBuilding.relevamientos > 0 ? 'Recorrido completado' : 'Sin recorridos',
              valueColor: currentBuilding.relevamientos > 0 ? '#10B981' : '#8A8C8E',
              iconColor: currentBuilding.relevamientos > 0 ? '#10B981' : '#8A8C8E',
            },
            {
              Icon: Clock,
              label: 'Duración',
              value: currentBuilding.relevamientos > 0 ? '1h 35min' : '—',
              valueColor: '#1A1C1E',
              iconColor: '#11676A',
            },
            {
              Icon: Map,
              label: 'Cobertura',
              value: currentBuilding.relevamientos > 0 ? '100% de la planta' : '—',
              valueColor: '#1A1C1E',
              iconColor: '#11676A',
            },
            {
              Icon: Bot,
              label: 'Robot utilizado',
              value: currentBuilding.lastRobot !== '—' ? currentBuilding.lastRobot : '—',
              valueColor: '#1A1C1E',
              iconColor: '#11676A',
            },
          ] as const).map(({ Icon, label, value, valueColor, iconColor }, i) => (
            <div key={i} className={`flex-1 flex items-center gap-3 px-3 ${i < 3 ? 'border-r border-[#F0EDE8]' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-[#11676A]/[0.07] flex items-center justify-center flex-none">
                <Icon className="w-4 h-4" style={{ color: iconColor }} />
              </div>
              <div>
                <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-[13px] font-semibold leading-tight" style={{ color: valueColor }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Floor plan */}
        <div className="flex-1 relative overflow-hidden min-h-0" style={GRID_BG}>
          {currentBuilding.relevamientos > 0 ? (
            <svg
              viewBox="0 0 800 600"
              className="w-full h-full"
              fill="none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <pattern id="recGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F0EDE8" strokeWidth="0.8" />
                </pattern>
                <filter id="startGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="endGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              <rect width="800" height="600" fill="rgba(255,255,255,0.92)" />
              <rect width="800" height="600" fill="url(#recGrid)" />

              {/* Walls */}
              <path d="M50 50 L750 50 L750 550 L50 550 Z" stroke="#C8C5BF" strokeWidth="5" />
              <path d="M250 50 L250 350 L50 350"   stroke="#C8C5BF" strokeWidth="3.5" />
              <path d="M500 50 L500 250 L750 250"  stroke="#C8C5BF" strokeWidth="3.5" />
              <path d="M350 550 L350 350 L500 350 L500 550" stroke="#C8C5BF" strokeWidth="3.5" />
              {/* Doors */}
              <path d="M250 150 A50 50 0 0 1 300 200 L250 200" fill="none" stroke="#A0A2A4" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M250 150 L250 200" stroke="#FFFFFF" strokeWidth="5" />
              <path d="M400 350 A50 50 0 0 0 450 300 L450 350" fill="none" stroke="#A0A2A4" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M400 350 L450 350" stroke="#FFFFFF" strokeWidth="5" />
              <path d="M500 150 A50 50 0 0 1 550 200 L500 200" fill="none" stroke="#A0A2A4" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M500 150 L500 200" stroke="#FFFFFF" strokeWidth="5" />
              {/* Room labels */}
              <text x="145" y="210" fill="#C8C5BF" fontSize="11" fontFamily="DM Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala A</text>
              <text x="375" y="155" fill="#C8C5BF" fontSize="11" fontFamily="DM Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala B</text>
              <text x="625" y="155" fill="#C8C5BF" fontSize="11" fontFamily="DM Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala C</text>
              <text x="420" y="460" fill="#C8C5BF" fontSize="11" fontFamily="DM Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala D</text>
              <text x="575" y="410" fill="#C8C5BF" fontSize="11" fontFamily="DM Sans, sans-serif" fontWeight="500" textAnchor="middle">Pasillo</text>

              {/* Trajectory */}
              <polyline
                points={trajStr}
                fill="none"
                stroke="#11676A"
                strokeWidth="2.5"
                strokeOpacity="0.45"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 3"
              />
              <polyline
                points={trajStr}
                fill="none"
                stroke="#11676A"
                strokeWidth="1.5"
                strokeOpacity="0.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Start marker */}
              <g filter="url(#startGlow)">
                <circle cx={START[0]} cy={START[1]} r="12" fill="#10B981" fillOpacity="0.18" />
                <circle cx={START[0]} cy={START[1]} r="7"  fill="#10B981" />
                <circle cx={START[0]} cy={START[1]} r="3"  fill="white" />
              </g>
              <text x={START[0] + 15} y={START[1] - 10} fill="#10B981" fontSize="9" fontFamily="DM Sans, sans-serif" fontWeight="700" letterSpacing="0.04em">INICIO</text>

              {/* End marker */}
              <g filter="url(#endGlow)">
                <circle cx={END[0]} cy={END[1]} r="12" fill="#11676A" fillOpacity="0.18" />
                <rect x={END[0] - 7} y={END[1] - 7} width="14" height="14" rx="3" fill="#11676A" />
                <rect x={END[0] - 3} y={END[1] - 3} width="6"  height="6"  rx="1" fill="white" />
              </g>
              <text x={END[0] + 15} y={END[1] - 10} fill="#11676A" fontSize="9" fontFamily="DM Sans, sans-serif" fontWeight="700" letterSpacing="0.04em">FIN</text>
            </svg>
          ) : (
            /* No relevamientos empty state */
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.07)] flex items-center justify-center mb-5">
                <Map className="w-8 h-8 text-[#C8C5BF]" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#1A1C1E] mb-2">Sin recorridos disponibles</h3>
              <p className="text-[13px] text-[#8A8C8E] max-w-[280px] leading-relaxed">
                Este edificio todavía no tiene relevamientos. Iniciá una inspección para registrar el primer recorrido.
              </p>
            </div>
          )}

          {currentBuilding.relevamientos > 0 && (
            <>
              {/* Legend */}
              <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md rounded-xl px-3.5 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest mb-2">Trayectoria</p>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#10B981] flex-none" />
                  <span className="text-[11px] font-medium text-[#1A1C1E]">Punto de inicio</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-sm bg-[#11676A] flex-none" />
                  <span className="text-[11px] font-medium text-[#1A1C1E]">Punto de fin</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 border-t-2 border-dashed border-[#11676A]/60 flex-none" />
                  <span className="text-[11px] font-medium text-[#1A1C1E]">Recorrido del robot</span>
                </div>
              </div>

              {/* Zoom controls */}
              <div className="absolute bottom-5 right-5 z-20 flex flex-col bg-white/80 backdrop-blur-md rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                <button className="p-2.5 hover:bg-[#11676A]/10 text-[#66686A] hover:text-[#11676A] transition-colors" title="Acercar">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="h-px bg-[#11676A]/10" />
                <button className="p-2.5 hover:bg-[#11676A]/10 text-[#66686A] hover:text-[#11676A] transition-colors" title="Alejar">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="h-px bg-[#11676A]/10" />
                <button className="p-2.5 hover:bg-[#11676A]/10 text-[#66686A] hover:text-[#11676A] transition-colors" title="Restaurar">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bottom info panel */}
        <div className="flex-none bg-white border-t border-[#EDEBE6]" style={{ minHeight: '168px' }}>

          {/* Tab bar */}
          <div className="flex items-center border-b border-[#EDEBE6] px-5">
            <div className="flex items-center gap-1 flex-1">
              {infoTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInfoTab(tab.id)}
                  className={`px-4 py-3 text-[12px] font-semibold transition-colors border-b-2 -mb-px ${
                    infoTab === tab.id
                      ? 'border-[#11676A] text-[#11676A]'
                      : 'border-transparent text-[#8A8C8E] hover:text-[#1A1C1E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {currentBuilding.relevamientos > 0 && (
              <button
                onClick={onViewDetails}
                className="flex items-center gap-2 px-5 py-2 bg-[#11676A] hover:bg-[#0E5254] text-white text-[12px] font-semibold rounded-xl transition-colors shadow-[0_2px_10px_rgba(17,103,106,0.25)]"
              >
                Ver detalles
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tab content */}
          <div className="px-6 py-4">
            {infoTab === 'datos' && (
              <div className="flex items-start gap-10">
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Inicio</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">{currentBuilding.lastRelevamientoDate !== '—' ? currentBuilding.lastRelevamientoDate : '—'}</p>
                  <p className="text-[11px] text-[#8A8C8E]">14:30 hs</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Fin</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">{currentBuilding.lastRelevamientoDate !== '—' ? currentBuilding.lastRelevamientoDate : '—'}</p>
                  <p className="text-[11px] text-[#8A8C8E]">16:05 hs</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Duración total</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">{currentBuilding.relevamientos > 0 ? '1h 35min' : '—'}</p>
                  <p className="text-[11px] text-[#8A8C8E]">Planta 1</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Cobertura</p>
                  {currentBuilding.relevamientos > 0 ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-20 h-1.5 bg-[#E2DFD8] rounded-full overflow-hidden">
                        <div className="h-full bg-[#11676A] rounded-full w-full" />
                      </div>
                      <span className="text-[13px] font-bold text-[#11676A]">100%</span>
                    </div>
                  ) : (
                    <p className="text-[13px] font-semibold text-[#8A8C8E]">—</p>
                  )}
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Estado</p>
                  {currentBuilding.relevamientos > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#DCEFEF] text-[#0B5559] text-[11px] font-semibold rounded-lg">
                      <CheckCircle2 className="w-3 h-3" />
                      Completado
                    </span>
                  ) : (
                    <span className="text-[13px] font-semibold text-[#8A8C8E]">Sin recorridos</span>
                  )}
                </div>
              </div>
            )}

            {infoTab === 'robot' && (
              <div className="flex items-start gap-10">
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Identificación</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">{currentBuilding.lastRobot}</p>
                  <p className="text-[11px] text-[#8A8C8E]">Robot de inspección autónomo</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Batería al inicio</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">100%</p>
                  <p className="text-[11px] text-[#8A8C8E]">Carga completa</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Batería al fin</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-20 h-1.5 bg-[#E2DFD8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#10B981] rounded-full" style={{ width: '72%' }} />
                    </div>
                    <span className="text-[13px] font-bold text-[#10B981]">72%</span>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Sensores activos</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">Cámara, LiDAR 3D, WiFi</p>
                  <p className="text-[11px] text-[#8A8C8E]">Sin fallas registradas</p>
                </div>
              </div>
            )}

            {infoTab === 'operador' && (
              <div className="flex items-start gap-10">
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Nombre</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">{currentBuilding.lastOperator}</p>
                  <p className="text-[11px] text-[#8A8C8E]">Técnico de inspección</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Inicio de sesión</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">{currentBuilding.lastRelevamientoDate}, 14:25 hs</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Organización</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">Municipalidad CABA — Zona Norte</p>
                </div>
              </div>
            )}

            {infoTab === 'edificio' && (
              <div className="flex items-start gap-10">
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Edificio</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">{currentBuilding.name}</p>
                  <p className="text-[11px] text-[#8A8C8E]">{currentBuilding.address}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Planta recorrida</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">Planta 1</p>
                  <p className="text-[11px] text-[#8A8C8E]">de {currentBuilding.floors} plantas totales</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Año de construcción</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">{currentBuilding.yearBuilt}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1">Total relevamientos</p>
                  <p className="text-[13px] font-semibold text-[#1A1C1E]">
                    {currentBuilding.relevamientos > 0 ? `${currentBuilding.relevamientos} relevamientos` : 'Sin relevamientos'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
