import React, { useEffect, useState } from 'react';
import { duracion, etiquetaEstado, horaLocal } from './formato';
import MapaHallazgos from './MapaHallazgos';
import ActivityBar, { NavTab } from './ActivityBar';
import type { Building } from './data';
import { useProyectos, EDIFICIO_VACIO } from './proyectos';
import { TopNav, ProjectsSidebar, TurquoiseCard, PanelTitle, PanelLabel, PanelText, PrimaryButton } from './components';
import {
  Map,
  ZoomIn, ZoomOut, Maximize, ArrowRight,
} from 'lucide-react';

const GRID_BG = {
  backgroundColor: '#FFFFFF',
  backgroundImage: `linear-gradient(rgba(229,231,235,0.17) 1px, transparent 1px), linear-gradient(90deg, rgba(229,231,235,0.17) 1px, transparent 1px)`,
  backgroundSize: '22px 22px',
} as const;

// Full floor-plan trajectory in 800×600 viewBox space
// Points are routed so the line always crosses a wall through its door opening
const TRAJ_POINTS: [number, number][] = [
  [144, 210], [144, 132], [250, 175], [370, 132],
  [370, 200], [440, 200], [440, 132], [500, 175],
  [578, 132], [578, 240], [500, 185], [450, 240],
  [450, 345], [425, 345], [425, 440], [376, 440],
  [425, 345], [578, 300], [578, 440], [578, 340],
];
const START    = TRAJ_POINTS[0];
const END      = TRAJ_POINTS[TRAJ_POINTS.length - 1];
const trajStr  = TRAJ_POINTS.map(([x, y]) => `${x},${y}`).join(' ');

// A handful of segments (by start-index) get a small direction chevron,
// so the line reads as "robot travelling this way", not just a static trace
const ARROW_SEGMENTS = [1, 6, 10, 13, 16];
function segmentArrow(i: number) {
  const [x1, y1] = TRAJ_POINTS[i];
  const [x2, y2] = TRAJ_POINTS[i + 1];
  return {
    mx: (x1 + x2) / 2,
    my: (y1 + y2) / 2,
    angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
  };
}

// Default to first building that has relevamientos
// El edificio por defecto ahora sale de los datos de AWS (useProyectos).

type TabId = 'datos' | 'robot' | 'operador' | 'edificio';

interface InspectionRecorridoProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onViewDetails: () => void;
  selectedBuildingId?: string | null;
  onSelectBuilding?: (id: string) => void;
}

export default function InspectionRecorrido({ activeTab, onTabChange, onViewDetails, selectedBuildingId, onSelectBuilding }: InspectionRecorridoProps) {
  const [infoTab, setInfoTab] = useState<TabId>('datos');
  const { proyectos, recargar } = useProyectos();
  useEffect(() => {
    recargar();
  }, [recargar]);
  const edificios = proyectos.flatMap(p => p.buildings);
  const currentBuildingId = selectedBuildingId ?? edificios[0]?.id ?? '';

  const currentBuilding: Building =
    edificios.find(b => b.id === currentBuildingId) ?? EDIFICIO_VACIO;

  const infoTabs: { id: TabId; label: string }[] = [
    { id: 'datos',    label: 'Datos del recorrido' },
    { id: 'robot',    label: 'Robot' },
    { id: 'operador', label: 'Operador' },
    { id: 'edificio', label: 'Edificio' },
  ];

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab === 'recorrido' ? 'dashboard' : activeTab} onChange={onTabChange} />

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />

        <div className="flex flex-1 overflow-hidden">
          <ProjectsSidebar
            selectedBuildingId={currentBuildingId}
            onSelectBuilding={id => onSelectBuilding?.(id)}
            onNewBuilding={() => onTabChange('nuevo-edificio')}
          />

        <div className="flex flex-col flex-1 overflow-hidden min-h-0">

        {/* Floor plan */}
        <div className="flex-1 relative overflow-hidden min-h-0" style={GRID_BG}>
          {currentBuilding.relevamientos > 0 ? (
            <MapaHallazgos
              relevamientoId={currentBuilding.ultimoRelevamiento?.id}
              enCurso={currentBuilding.ultimoRelevamiento?.estado === 'en_curso'}
            />
          ) : false ? (
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
                <linearGradient id="trajGradient" gradientUnits="userSpaceOnUse" x1={START[0]} y1={START[1]} x2={END[0]} y2={END[1]}>
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#377DC0" />
                </linearGradient>
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
              <text x="145" y="310" fill="#C8C5BF" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala A</text>
              <text x="375" y="155" fill="#C8C5BF" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala B</text>
              <text x="625" y="155" fill="#C8C5BF" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala C</text>
              <text x="420" y="460" fill="#C8C5BF" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala D</text>
              <text x="575" y="410" fill="#C8C5BF" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500" textAnchor="middle">Pasillo</text>

              {/* Trajectory */}
              <polyline
                points={trajStr}
                fill="none"
                stroke="#377DC0"
                strokeWidth="2.5"
                strokeOpacity="0.45"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 3"
              />
              <polyline
                points={trajStr}
                fill="none"
                stroke="url(#trajGradient)"
                strokeWidth="1.5"
                strokeOpacity="0.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Direction chevrons — reads as the robot's travel, not a static trace */}
              {ARROW_SEGMENTS.map(i => {
                const { mx, my, angle } = segmentArrow(i);
                return (
                  <path
                    key={i}
                    d="M -4 -3 L 5 0 L -4 3 Z"
                    fill="#377DC0"
                    fillOpacity="0.5"
                    transform={`translate(${mx} ${my}) rotate(${angle})`}
                  />
                );
              })}

              {/* Start marker */}
              <g filter="url(#startGlow)">
                <circle cx={START[0]} cy={START[1]} r="12" fill="#10B981" fillOpacity="0.18" />
                <circle cx={START[0]} cy={START[1]} r="7"  fill="#10B981" />
                <circle cx={START[0]} cy={START[1]} r="3"  fill="white" />
              </g>
              <text x={START[0] + 15} y={START[1] - 10} fill="#10B981" fontSize="9" fontFamily="IBM Plex Sans, sans-serif" fontWeight="700" letterSpacing="0.04em">INICIO</text>

              {/* End marker — gentle pulse marks it as the current/final position */}
              <g filter="url(#endGlow)">
                <circle cx={END[0]} cy={END[1]} r="12" fill="#377DC0" fillOpacity="0.18" className="route-end-pulse" />
                <rect x={END[0] - 7} y={END[1] - 7} width="14" height="14" rx="3" fill="#377DC0" />
                <rect x={END[0] - 3} y={END[1] - 3} width="6"  height="6"  rx="1" fill="white" />
              </g>
              <text x={END[0] + 15} y={END[1] - 10} fill="#377DC0" fontSize="9" fontFamily="IBM Plex Sans, sans-serif" fontWeight="700" letterSpacing="0.04em">FIN</text>

              {/* North arrow */}
              <g transform="translate(766,30)">
                <path d="M0,-9 L5,4 L0,1 L-5,4 Z" fill="#A0A2A4" />
                <text x="0" y="17" textAnchor="middle" fontSize="8" fontWeight="700" fill="#8A8C8E" fontFamily="IBM Plex Sans, sans-serif">N</text>
              </g>

              {/* Scale bar */}
              <g>
                <line x1="70" y1="575" x2="150" y2="575" stroke="#8A8C8E" strokeWidth="1.5" />
                <line x1="70" y1="571" x2="70" y2="579" stroke="#8A8C8E" strokeWidth="1.5" />
                <line x1="150" y1="571" x2="150" y2="579" stroke="#8A8C8E" strokeWidth="1.5" />
                <text x="110" y="590" textAnchor="middle" fontSize="9" fill="#8A8C8E" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500">5 m</text>
              </g>
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

          {false && (
            <>
              {/* Legend */}
              <TurquoiseCard size="overlay" className="absolute top-4 left-4">
                <div className="px-3.5 pt-3 pb-1">
                  <PanelTitle>Trayectoria</PanelTitle>
                </div>
                <div className="px-3.5 pt-1 pb-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#10B981] flex-none" />
                    <PanelText className="leading-none">Punto de inicio</PanelText>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-[#377DC0] flex-none" />
                    <PanelText className="leading-none">Punto de fin</PanelText>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 border-t-2 border-dashed border-[#377DC0]/60 flex-none" />
                    <PanelText className="leading-none">Recorrido del robot</PanelText>
                  </div>
                </div>
              </TurquoiseCard>

              {/* Zoom controls */}
              <div className="absolute bottom-5 right-5 z-20 flex flex-col bg-white/80 backdrop-blur-md rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                <button className="p-2.5 hover:bg-[#377DC0]/10 text-[#66686A] hover:text-[#377DC0] transition-colors" title="Acercar">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="h-px bg-[#377DC0]/10" />
                <button className="p-2.5 hover:bg-[#377DC0]/10 text-[#66686A] hover:text-[#377DC0] transition-colors" title="Alejar">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="h-px bg-[#377DC0]/10" />
                <button className="p-2.5 hover:bg-[#377DC0]/10 text-[#66686A] hover:text-[#377DC0] transition-colors" title="Restaurar">
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
                      ? 'border-[#377DC0] text-[#377DC0]'
                      : 'border-transparent text-[#8A8C8E] hover:text-[#1A1C1E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {currentBuilding.relevamientos > 0 && (
              <PrimaryButton onClick={onViewDetails} iconRight={<ArrowRight className="w-3.5 h-3.5" />} shadow>
                Ver relevamiento
              </PrimaryButton>
            )}
          </div>

          {/* Tab content */}
          <div className="px-6 py-4">
            {infoTab === 'datos' && (
              <div className="flex items-start">
                <div className="pr-8">
                  <PanelLabel>Inicio</PanelLabel>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {currentBuilding.relevamientos > 0 && <span className="w-2 h-2 rounded-full bg-[#10B981] flex-none" />}
                    <PanelText className="font-semibold">{currentBuilding.lastRelevamientoDate !== '—' ? currentBuilding.lastRelevamientoDate : '—'}</PanelText>
                  </div>
                  <p className="text-[11px] text-[#8A8C8E] mt-0.5">{horaLocal(currentBuilding.ultimoRelevamiento?.inicio)}</p>
                </div>
                <div className="px-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Fin</PanelLabel>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {currentBuilding.relevamientos > 0 && <span className="w-2 h-2 rounded-sm bg-[#377DC0] flex-none" />}
                    <PanelText className="font-semibold">{currentBuilding.lastRelevamientoDate !== '—' ? currentBuilding.lastRelevamientoDate : '—'}</PanelText>
                  </div>
                  <p className="text-[11px] text-[#8A8C8E] mt-0.5">{horaLocal(currentBuilding.ultimoRelevamiento?.fin)}</p>
                </div>
                <div className="px-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Duración total</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{currentBuilding.relevamientos > 0 ? duracion(currentBuilding.ultimoRelevamiento) : '—'}</PanelText>
                  <p className="text-[11px] text-[#8A8C8E]">&nbsp;</p>
                </div>
                <div className="px-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Cobertura</PanelLabel>
                  {currentBuilding.relevamientos > 0 ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 h-2 bg-[#E2DFD8] rounded-full overflow-hidden">
                        <div className="h-full bg-[#377DC0] rounded-full w-0" />
                      </div>
                      <span className="text-[13px] font-bold text-[#377DC0]">—</span>
                    </div>
                  ) : (
                    <PanelText className="font-semibold text-[#8A8C8E] mt-0.5">—</PanelText>
                  )}
                </div>
                <div className="pl-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Estado</PanelLabel>
                  {currentBuilding.relevamientos > 0 ? (
                    <span
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#14202B] mt-1 px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(16,185,129,0.09)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] flex-none" />
                      {etiquetaEstado(currentBuilding.ultimoRelevamiento?.estado)}
                    </span>
                  ) : (
                    <PanelText className="font-semibold text-[#8A8C8E] mt-0.5">Sin recorridos</PanelText>
                  )}
                </div>
              </div>
            )}

            {infoTab === 'robot' && (
              <div className="flex items-start">
                <div className="pr-8">
                  <PanelLabel>Identificación</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{currentBuilding.lastRobot}</PanelText>
                  <p className="text-[11px] text-[#8A8C8E]">Robot de inspección autónomo</p>
                </div>
                <div className="px-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Batería al inicio</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">100%</PanelText>
                  <p className="text-[11px] text-[#8A8C8E]">Carga completa</p>
                </div>
                <div className="px-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Batería al fin</PanelLabel>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-2 bg-[#E2DFD8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#10B981] rounded-full" style={{ width: '72%' }} />
                    </div>
                    <span className="text-[13px] font-bold text-[#10B981]">72%</span>
                  </div>
                </div>
                <div className="pl-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Sensores activos</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">Cámara, LiDAR 3D, WiFi</PanelText>
                  <p className="text-[11px] text-[#8A8C8E]">Sin fallas registradas</p>
                </div>
              </div>
            )}

            {infoTab === 'operador' && (
              <div className="flex items-start">
                <div className="pr-8">
                  <PanelLabel>Nombre</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{currentBuilding.lastOperator}</PanelText>
                  <p className="text-[11px] text-[#8A8C8E]">Técnico de inspección</p>
                </div>
                <div className="px-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Inicio de sesión</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{currentBuilding.lastRelevamientoDate}, {horaLocal(currentBuilding.ultimoRelevamiento?.inicio)}</PanelText>
                </div>
                <div className="pl-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Organización</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">Sin asignar</PanelText>
                </div>
              </div>
            )}

            {infoTab === 'edificio' && (
              <div className="flex items-start">
                <div className="pr-8">
                  <PanelLabel>Edificio</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{currentBuilding.name}</PanelText>
                  <p className="text-[11px] text-[#8A8C8E]">{currentBuilding.address}</p>
                </div>
                <div className="px-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Planta recorrida</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">—</PanelText>
                  <p className="text-[11px] text-[#8A8C8E]">de {currentBuilding.floors} plantas totales</p>
                </div>
                <div className="px-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Año de construcción</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">{currentBuilding.yearBuilt}</PanelText>
                </div>
                <div className="pl-8 border-l border-[#EDEBE6]">
                  <PanelLabel>Total relevamientos</PanelLabel>
                  <PanelText className="font-semibold mt-0.5">
                    {currentBuilding.relevamientos > 0 ? `${currentBuilding.relevamientos} relevamientos` : 'Sin relevamientos'}
                  </PanelText>
                </div>
              </div>
            )}
          </div>
        </div>

        </div>
        </div>

      </div>
    </div>
  );
}
