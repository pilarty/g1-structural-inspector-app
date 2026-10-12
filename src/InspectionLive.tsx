import React, { useState, useEffect } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, StatBlock, PanelLabel, PanelText } from './components';
import { Square } from 'lucide-react';
import { BACKEND_URL } from './sesion';
import { useProyectos } from './proyectos';

const GRID_BG = {
  backgroundColor: '#FFFFFF',
  backgroundImage: `linear-gradient(rgba(229,231,235,0.17) 1px, transparent 1px), linear-gradient(90deg, rgba(229,231,235,0.17) 1px, transparent 1px)`,
  backgroundSize: '22px 22px',
} as const;

// Robot path through the floor plan (percentage coordinates)
const ROBOT_PATH: [number, number][] = [
  [18, 35], [30, 35], [30, 22], [48, 22],
  [48, 35], [58, 35], [58, 22], [72, 22],
  [72, 42], [58, 42], [58, 58], [48, 58],
  [48, 72], [35, 72], [35, 58], [22, 58],
  [22, 42], [18, 42], [18, 35],
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function getRobotPosition(progress: number): [number, number] {
  const total = ROBOT_PATH.length - 1;
  const scaled = progress * total;
  const i = Math.min(Math.floor(scaled), total - 1);
  const t = scaled - i;
  const [ax, ay] = ROBOT_PATH[i];
  const [bx, by] = ROBOT_PATH[i + 1] ?? ROBOT_PATH[i];
  return [lerp(ax, bx, t), lerp(ay, by, t)];
}

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600).toString().padStart(2, '0');
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

interface InspectionLiveProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onStop: () => void;
}

export default function InspectionLive({ activeTab, onTabChange, onStop }: InspectionLiveProps) {
  const [elapsed, setElapsed] = useState(2533); // start at 42:13
  const [progress, setProgress] = useState(0.38);
  const [detections] = useState(3);
  const battery = Math.max(76 - Math.floor((elapsed - 2533) / 120), 60);

  const { recargar } = useProyectos();

  async function detener() {
    try {
      await fetch(`${BACKEND_URL}/nube/relevamientos/detener`, { method: 'POST' });
      recargar();
    } catch {
      // si falla la nube, igual volvemos a la pantalla anterior
    }
    onStop();
  }

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(e => e + 1);
      setProgress(p => Math.min(p + 0.0003, 0.99));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const [rx, ry] = getRobotPosition(progress);
  const trailCount = Math.floor(progress * (ROBOT_PATH.length - 1));
  const trailPoints = ROBOT_PATH.slice(0, trailCount + 1)
    .map(([x, y]) => `${x}%,${y}%`)
    .join(' ');

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">

        <TopNav
          badge={
            <span className="ml-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#377DC0] bg-white px-2.5 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Inspección en curso
            </span>
          }
        />

        {/* Stats row */}
        <div className="flex-none bg-white border-b border-[#EDEBE6] px-6 py-3 flex items-center gap-0">
          {[
            {
              label: 'Tiempo transcurrido',
              value: formatTime(elapsed),
              sub: 'hh:mm:ss',
              color: '#377DC0',
            },
            {
              label: 'Detecciones',
              value: `${detections}`,
              sub: 'hasta el momento',
              color: '#F97316',
            },
            {
              label: 'Batería',
              value: `${battery}%`,
              sub: 'HR-04 / Unidad 2',
              color: battery > 30 ? '#10B981' : '#EF4444',
            },
            {
              label: 'Conexión',
              value: 'Conectado',
              sub: 'WiFi 6 — Red_Obra_01',
              color: '#10B981',
              dot: true,
            },
          ].map((stat, i) => (
            <StatBlock
              key={i}
              variant="live"
              label={stat.label}
              value={stat.value}
              sub={stat.sub}
              valueColor={stat.color}
              dot={stat.dot}
              divider={i < 3}
            />
          ))}
        </div>

        {/* Main area */}
        <div className="flex flex-1 overflow-hidden">

          {/* Floor plan */}
          <div className="flex-1 relative overflow-hidden" style={GRID_BG}>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <defs>
                <pattern id="liveGrid" width="5" height="5" patternUnits="userSpaceOnUse">
                  <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#F0EDE8" strokeWidth="0.3" />
                </pattern>
                <filter id="robotGlow">
                  <feGaussianBlur stdDeviation="0.8" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Floor plan background */}
              <rect width="100" height="100" fill="rgba(255,255,255,0.90)" />
              <rect width="100" height="100" fill="url(#liveGrid)" />

              {/* Outer walls */}
              <path d="M8 10 L92 10 L92 90 L8 90 Z" stroke="#C8C5BF" strokeWidth="1.5" fill="none" />
              {/* Inner walls */}
              <path d="M38 10 L38 55 L8 55" stroke="#C8C5BF" strokeWidth="1" fill="none" />
              <path d="M62 10 L62 40 L92 40" stroke="#C8C5BF" strokeWidth="1" fill="none" />
              <path d="M50 90 L50 60 L62 60 L62 90" stroke="#C8C5BF" strokeWidth="1" fill="none" />
              {/* Doors */}
              <path d="M38 28 A8 8 0 0 1 46 36 L38 36" fill="none" stroke="#A0A2A4" strokeWidth="0.5" strokeDasharray="1.5 1" />
              <path d="M38 28 L38 36" stroke="#FFFFFF" strokeWidth="1.5" />
              <path d="M62 25 A8 8 0 0 0 70 33 L70 25" fill="none" stroke="#A0A2A4" strokeWidth="0.5" strokeDasharray="1.5 1" />
              <path d="M62 25 L70 25" stroke="#FFFFFF" strokeWidth="1.5" />
              {/* Room labels */}
              <text x="23" y="35" fill="#D0CCC6" fontSize="4" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala A</text>
              <text x="50" y="27" fill="#D0CCC6" fontSize="4" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala B</text>
              <text x="77" y="27" fill="#D0CCC6" fontSize="4" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala C</text>
              <text x="55" y="76" fill="#D0CCC6" fontSize="4" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500" textAnchor="middle">Sala D</text>
              <text x="72" y="65" fill="#D0CCC6" fontSize="3.5" fontFamily="IBM Plex Sans, sans-serif" fontWeight="500" textAnchor="middle">Pasillo</text>

              {/* Robot trail */}
              {trailPoints && (
                <polyline
                  points={trailPoints}
                  fill="none"
                  stroke="#377DC0"
                  strokeWidth="0.8"
                  strokeOpacity="0.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="2 1"
                />
              )}

              {/* Robot position */}
              <g transform={`translate(${rx}%, ${ry}%)`} filter="url(#robotGlow)">
                <circle r="3" fill="rgba(55,125,192,0.15)" />
                <circle r="1.8" fill="#377DC0" />
                <circle r="0.8" fill="white" />
              </g>
            </svg>

            {/* Progress label */}
            <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md rounded-xl px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest mb-1">Cobertura</p>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-[#E2DFD8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#377DC0] rounded-full transition-all duration-1000"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <span className="text-[12px] font-bold text-[#377DC0] tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Right info panel */}
          <div className="flex-none w-[220px] bg-white border-l border-[#EDEBE6] flex flex-col overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-[#EDEBE6]">
              <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest mb-3">Parámetros</p>
              <div className="space-y-3">
                {[
                  { label: 'Edificio', value: 'Edificio Corrientes 1234' },
                  { label: 'Planta', value: 'Planta 1' },
                  { label: 'Inicio', value: '15 ago 2026, 09:00' },
                  { label: 'Robot', value: 'HR-04 / Unidad 2' },
                  { label: 'Operador', value: 'M. García' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <PanelLabel>{label}</PanelLabel>
                    <PanelText className="leading-snug mt-0.5">{value}</PanelText>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 py-3 border-b border-[#EDEBE6]">
              <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest mb-2">Sensores</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Cámara', ok: true },
                  { label: 'LiDAR 3D', ok: true },
                  { label: 'WiFi', ok: true },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: s.ok ? '#10B981' : '#EF4444' }} />
                    <span className="text-[11px] text-[#1A1C1E]">{s.label}</span>
                    <span className={`ml-auto text-[10px] font-semibold ${s.ok ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{s.ok ? 'OK' : 'Error'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 py-3 flex items-center text-[11px] text-[#8A8C8E]">
              <span>Red_Obra_01</span>
              <span className="ml-auto text-[#10B981] font-semibold">{battery}%</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex-none h-[60px] bg-white border-t border-[#EDEBE6] px-6 flex items-center justify-between">
          <p className="text-[12px] text-[#8A8C8E]">
            Inspección activa — el robot continúa recorriendo el edificio.
          </p>
          <button
            onClick={detener}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#EF4444]/25 text-[#991B1B] text-[13px] font-semibold rounded-xl transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Detener inspección
          </button>
        </div>

      </div>
    </div>
  );
}
