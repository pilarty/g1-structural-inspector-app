import React, { useState } from 'react';
import Home from './Home';
import InspectionSetup from './InspectionSetup';
import NewBuilding from './NewBuilding';
import BuildingEmpty from './BuildingEmpty';
import InspectionLive from './InspectionLive';
import InspectionRecorrido from './InspectionRecorrido';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav } from './components';
import {
  Building2,
  MapPin,
  Calendar,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize,
  X,
  Download,
  Map,
  Filter,
  Check,
  RotateCw,
  Clock,
  Layers,
  AlertTriangle,
} from 'lucide-react';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type DamageType = 'Grieta diagonal' | 'Grieta horizontal' | 'Humedad' | 'Desprendimiento';

interface Detection {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  severity: Severity;
  types: { type: DamageType; probability: number }[];
  date: string;
  image: string;
}

const severityColors: Record<Severity, string> = {
  low: '#10B981',
  medium: '#FBBF24',
  high: '#F97316',
  critical: '#EF4444'
};

const severityLabels: Record<Severity, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica'
};

const allDamages: DamageType[] = ['Grieta diagonal', 'Grieta horizontal', 'Humedad', 'Desprendimiento'];

const mockDetections: Detection[] = [
  {
    id: '14',
    x: 42,
    y: 35,
    severity: 'high',
    types: [
      { type: 'Grieta diagonal', probability: 87 },
      { type: 'Humedad', probability: 34 }
    ],
    date: '12 Ago 2026, 14:35',
    image: 'https://images.unsplash.com/photo-1518596637153-f725359a0f05?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '15',
    x: 65,
    y: 70,
    severity: 'low',
    types: [
      { type: 'Humedad', probability: 92 }
    ],
    date: '12 Ago 2026, 14:40',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '16',
    x: 25,
    y: 60,
    severity: 'critical',
    types: [
      { type: 'Desprendimiento', probability: 95 },
      { type: 'Grieta horizontal', probability: 78 }
    ],
    date: '12 Ago 2026, 14:45',
    image: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '17',
    x: 75,
    y: 20,
    severity: 'medium',
    types: [
      { type: 'Grieta horizontal', probability: 64 }
    ],
    date: '12 Ago 2026, 14:50',
    image: 'https://images.unsplash.com/photo-1518596637153-f725359a0f05?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '18',
    x: 50,
    y: 50,
    severity: 'low',
    types: [
      { type: 'Humedad', probability: 45 }
    ],
    date: '12 Ago 2026, 14:55',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const handleTabChange = (tab: NavTab) => setActiveTab(tab);

  const handleSelectBuilding = (id: string) => {
    setSelectedBuildingId(id);
    setActiveTab('recorrido');
  };

  const handleViewDetails = () => {
    setActiveTab('relevamiento');
  };

  if (activeTab === 'dashboard' || activeTab === 'edificios' || activeTab === 'equipo') {
    return (
      <Home
        onNavigateToFloorPlan={() => setActiveTab('relevamiento')}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={handleSelectBuilding}
      />
    );
  }

  if (activeTab === 'recorrido') {
    return (
      <InspectionRecorrido
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onViewDetails={handleViewDetails}
      />
    );
  }

  if (activeTab === 'inspeccion') {
    return <InspectionSetup activeTab={activeTab} onTabChange={handleTabChange} />;
  }

  if (activeTab === 'nuevo-edificio') {
    return <NewBuilding activeTab={activeTab} onTabChange={handleTabChange} onCancel={() => setActiveTab('dashboard')} />;
  }

  if (activeTab === 'building-empty') {
    return <BuildingEmpty activeTab={activeTab} onTabChange={handleTabChange} onStartInspection={() => setActiveTab('inspeccion')} />;
  }

  if (activeTab === 'inspeccion-en-curso') {
    return <InspectionLive activeTab={activeTab} onTabChange={handleTabChange} onStop={() => setActiveTab('dashboard')} />;
  }

  return <FloorPlan onBack={() => setActiveTab('dashboard')} activeTab={activeTab} onTabChange={handleTabChange} />;
}

function FloorPlan({ onBack, activeTab, onTabChange }: { onBack: () => void; activeTab: NavTab; onTabChange: (tab: NavTab) => void }) {
  const [selectedDamageTypes, setSelectedDamageTypes] = useState<Set<DamageType>>(new Set(allDamages));
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set(['low', 'medium', 'high', 'critical']));
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const [hoveredDetection, setHoveredDetection] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  const toggleDamageType = (type: DamageType) => {
    const next = new Set(selectedDamageTypes);
    next.has(type) ? next.delete(type) : next.add(type);
    setSelectedDamageTypes(next);
  };

  const toggleSeverity = (severity: Severity) => {
    const next = new Set(selectedSeverities);
    next.has(severity) ? next.delete(severity) : next.add(severity);
    setSelectedSeverities(next);
  };

  const filteredDetections = mockDetections.filter(d =>
    selectedSeverities.has(d.severity) &&
    d.types.some(t => selectedDamageTypes.has(t.type))
  );

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={tab => { onTabChange(tab); if (tab !== 'relevamiento') onBack(); }} />

      <div className="flex flex-col flex-1 overflow-hidden">

      <TopNav />

      {/* Sub-header — minimal, blends with plan */}
      <header className="flex-none h-[44px] bg-white border-b border-[#EDEBE6] px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-[#1A1C1E] whitespace-nowrap">Edificio Corrientes 1234</span>
          <span className="text-[#CCCAN8] text-xs select-none mx-1">·</span>
          <span className="text-[12px] text-[#8A8C8E] truncate">Av. Corrientes 1234, CABA</span>
        </div>
        <div className="flex items-center gap-2.5 flex-none">
          <button className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F3F1ED] hover:bg-[#ECEAE5] transition-colors rounded-lg text-[12px] font-medium text-[#1A1C1E] border border-[#E8E5DF]">
            <Calendar className="w-3 h-3 text-[#8A8C8E]" />
            Relevamiento — 12 ago 2026, 14:30
            <ChevronDown className="w-3 h-3 text-[#8A8C8E]" />
          </button>
          <span className="text-[11px] font-semibold bg-[#DCEFEF] text-[#0B5559] px-2.5 py-1 rounded-lg">
            Completado
          </span>
        </div>
      </header>

      {/* ── Full-screen plan area ── */}
      <div
        className="flex-1 relative overflow-hidden bg-white"
        style={{
          backgroundImage: `linear-gradient(rgba(229,231,235,0.17) 1px, transparent 1px), linear-gradient(90deg, rgba(229,231,235,0.17) 1px, transparent 1px)`,
          backgroundSize: '22px 22px'
        }}
      >

        {/* Floor plan SVG — full bleed background */}
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)', transformOrigin: 'center' }}
        >
          <svg viewBox="0 0 800 600" className="w-full h-full" fill="none" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F0EDE8" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="800" height="600" fill="rgba(255,255,255,0.88)" />
            <rect width="800" height="600" fill="url(#grid2)" />
            {/* Outer walls */}
            <path d="M50 50 L750 50 L750 550 L50 550 Z" stroke="#C8C5BF" strokeWidth="5" />
            {/* Inner walls */}
            <path d="M250 50 L250 350 L50 350" stroke="#C8C5BF" strokeWidth="3.5" />
            <path d="M500 50 L500 250 L750 250" stroke="#C8C5BF" strokeWidth="3.5" />
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
          </svg>

          {/* Pins — inside rotated container so they rotate with the plan */}
          {filteredDetections.map(det => {
            const isSelected = selectedDetection?.id === det.id;
            const isHovered = hoveredDetection === det.id;
            const color = severityColors[det.severity];
            return (
              <div
                key={det.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-all duration-150"
                style={{ left: `${det.x}%`, top: `${det.y}%` }}
                onMouseEnter={() => setHoveredDetection(det.id)}
                onMouseLeave={() => setHoveredDetection(null)}
                onClick={() => setSelectedDetection(det)}
              >
                <div className="relative flex items-center justify-center">
                  {isSelected && (
                    <div className="absolute w-9 h-9 rounded-full border-2" style={{ borderColor: '#11676A' }} />
                  )}
                  <div
                    className={`rounded-full transition-all duration-150 ${isSelected ? 'w-5 h-5' : isHovered ? 'w-4 h-4' : 'w-3.5 h-3.5'}`}
                    style={{ backgroundColor: color, boxShadow: '0 0 0 2.5px white, 0 2px 6px rgba(0,0,0,0.18)' }}
                  />
                  {isHovered && !isSelected && (
                    <div className="absolute bottom-full mb-2 bg-white px-3 py-1.5 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] whitespace-nowrap z-20 pointer-events-none">
                      <div className="text-[12px] font-semibold text-[#1A1C1E]">{det.types[0].type}</div>
                      <div className="text-[10px] text-[#8A8C8E]">Detección #{det.id}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── LEFT PANEL ── */}
        <div className="absolute left-4 top-4 bottom-4 w-[212px] z-20 flex flex-col gap-3 overflow-y-auto pointer-events-none">

          {/* Card: Filtros */}
          <div className="pointer-events-auto flex-shrink-0 bg-[#11676A]/[0.07] backdrop-blur-md rounded-xl overflow-hidden">
            <div className="px-3.5 pt-3 pb-2.5 flex items-center justify-between border-b border-[#11676A]/15">
              <span className="text-[12px] font-semibold text-[#1A1C1E] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#11676A]" />
                Filtros
              </span>
              <span className="text-[10px] font-bold bg-[#11676A]/20 text-[#0B5559] px-2 py-0.5 rounded-md">
                {filteredDetections.length}
              </span>
            </div>
            <div className="px-3.5 pt-2.5 pb-2.5 space-y-2">
              <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-2">Tipo de daño</p>
              {allDamages.map(type => (
                <label key={type} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => toggleDamageType(type)}
                    className={`w-4 h-4 rounded flex items-center justify-center transition-colors flex-none ${
                      selectedDamageTypes.has(type)
                        ? 'bg-[#11676A]/30'
                        : 'bg-white/10'
                    }`}
                  >
                    {selectedDamageTypes.has(type) && <Check className="w-2.5 h-2.5 text-[#0B5559]" />}
                  </div>
                  <span className="text-[11px] font-medium text-[#1A1C1E] leading-none">{type}</span>
                </label>
              ))}
            </div>
            <div className="h-px bg-[#11676A]/15 mx-3.5" />
            <div className="px-3.5 pt-2.5 pb-3 space-y-2">
              <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-2">Severidad</p>
              {(Object.keys(severityColors) as Severity[]).map(sev => (
                <label key={sev} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => toggleSeverity(sev)}
                    className={`w-4 h-4 rounded flex items-center justify-center transition-colors flex-none ${
                      selectedSeverities.has(sev)
                        ? 'bg-[#11676A]/30'
                        : 'bg-white/10'
                    }`}
                  >
                    {selectedSeverities.has(sev) && <Check className="w-2.5 h-2.5 text-[#0B5559]" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: severityColors[sev] }} />
                    <span className="text-[11px] font-medium text-[#1A1C1E] leading-none">{severityLabels[sev]}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Card: Resumen */}
          <div className="pointer-events-auto bg-[#11676A]/[0.07] backdrop-blur-md rounded-xl overflow-hidden">
            <div className="px-3.5 pt-3 pb-2.5 border-b border-[#11676A]/15 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#11676A]" />
              <span className="text-[12px] font-semibold text-[#1A1C1E]">Resumen</span>
            </div>
            <div className="px-3.5 pt-3 pb-3">
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-[30px] font-bold text-[#1A1C1E] leading-none tracking-tight">{mockDetections.length}</span>
                <span className="text-[11px] font-medium text-[#2D2F31]">detecciones</span>
              </div>
              <div className="space-y-1.5">
                {(Object.keys(severityColors) as Severity[]).map(sev => {
                  const count = mockDetections.filter(d => d.severity === sev).length;
                  return (
                    <div key={sev} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: severityColors[sev] }} />
                      <span className="text-[11px] text-[#2D2F31] flex-1">{severityLabels[sev]}</span>
                      <span className="text-[12px] font-bold text-[#1A1C1E] tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex h-1.5 rounded-full overflow-hidden gap-px">
                {(Object.keys(severityColors) as Severity[]).map(sev => {
                  const count = mockDetections.filter(d => d.severity === sev).length;
                  const pct = (count / mockDetections.length) * 100;
                  return pct > 0 ? <div key={sev} style={{ width: `${pct}%`, backgroundColor: severityColors[sev] }} /> : null;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="absolute right-4 top-4 bottom-4 w-[212px] z-20 flex flex-col gap-3 overflow-y-auto pointer-events-none">

          {/* Card: Datos del edificio */}
          <div className="pointer-events-auto bg-[#11676A]/[0.07] backdrop-blur-md rounded-xl overflow-hidden">
            <div className="px-3.5 pt-3 pb-2.5 border-b border-[#11676A]/15 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#11676A]" />
              <span className="text-[12px] font-semibold text-[#1A1C1E]">Datos del edificio</span>
            </div>
            <div className="px-3.5 pt-2.5 pb-2.5 space-y-2.5">
              <div>
                <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-0.5">Nombre</p>
                <p className="text-[12px] font-semibold text-[#1A1C1E] leading-snug">Edificio Corrientes 1234</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-0.5">Dirección</p>
                <p className="text-[11px] text-[#1A1C1E]">Av. Corrientes 1234, CABA</p>
              </div>
            </div>
            <div className="h-px bg-[#11676A]/15" />
            <div className="px-3.5 py-2.5 flex gap-5">
              <div>
                <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-0.5">Plantas</p>
                <div className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[#11676A]" />
                  <span className="text-[14px] font-bold text-[#1A1C1E]">8</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-0.5">Año</p>
                <span className="text-[14px] font-bold text-[#1A1C1E]">1978</span>
              </div>
            </div>
          </div>

          {/* Card: Relevamiento */}
          <div className="pointer-events-auto bg-[#11676A]/[0.07] backdrop-blur-md rounded-xl overflow-hidden">
            <div className="px-3.5 pt-3 pb-2.5 border-b border-[#11676A]/15 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#1A1C1E] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#11676A]" />
                Relevamiento
              </span>
              <span className="text-[10px] font-bold bg-[#11676A]/20 text-[#0B5559] px-2 py-0.5 rounded-md">
                Completado
              </span>
            </div>
            <div className="px-3.5 pt-2.5 pb-2.5 space-y-2.5">
              <div className="flex gap-4">
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-0.5">Inicio</p>
                  <p className="text-[11px] font-medium text-[#1A1C1E]">12 ago 2026</p>
                  <p className="text-[10px] text-[#2D2F31]">14:30</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-0.5">Fin</p>
                  <p className="text-[11px] font-medium text-[#1A1C1E]">12 ago 2026</p>
                  <p className="text-[10px] text-[#2D2F31]">16:05</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-0.5">Duración</p>
                <p className="text-[15px] font-bold text-[#1A1C1E] leading-none">1h 35min</p>
              </div>
            </div>
            <div className="h-px bg-[#11676A]/15" />
            <div className="px-3.5 py-2.5 space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest">Cobertura</p>
                  <span className="text-[11px] font-bold text-[#11676A]">100%</span>
                </div>
                <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-[#11676A] rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-0.5">Robot</p>
                <p className="text-[11px] font-medium text-[#1A1C1E]">HR-04 <span className="text-[#2D2F31] font-normal">/ Unidad 2</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Zoom controls — bottom left */}
        <div className="absolute bottom-5 left-[228px] z-20 flex flex-col bg-white/80 backdrop-blur-md rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
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

        {/* Rotate button */}
        <button
          onClick={() => setRotation(r => (r + 90) % 360)}
          className="absolute bottom-5 left-[276px] z-20 w-10 h-10 bg-white/80 backdrop-blur-md rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#66686A] hover:bg-[#11676A]/10 hover:text-[#11676A] transition-colors"
          title="Rotar 90°"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {rotation !== 0 && (
          <div className="absolute bottom-5 left-[326px] z-20 bg-white/80 backdrop-blur-md rounded-xl px-2.5 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <span className="text-[11px] font-bold text-[#11676A] tabular-nums">{rotation}°</span>
          </div>
        )}
      </div>

      {selectedDetection && (
        <div className="fixed inset-0 bg-[#1A1C1E]/25 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDetection(null)}>
          <div
            className="bg-white rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.16)] w-full max-w-[800px] overflow-hidden flex flex-col md:flex-row"
            onClick={e => e.stopPropagation()}
          >
            {/* Image Area */}
            <div className="w-full md:w-[380px] h-[280px] md:h-auto bg-[#F3F1ED] relative flex-none">
              <img
                src={selectedDetection.image}
                alt="Foto de la detección"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
                <div className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: severityColors[selectedDetection.severity] }} />
                <span className="text-[11px] font-semibold text-[#1A1C1E]">
                  Severidad {severityLabels[selectedDetection.severity]}
                </span>
              </div>
            </div>

            {/* Details Area */}
            <div className="flex-1 flex flex-col p-7 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-[20px] font-bold text-[#1A1C1E] leading-tight tracking-tight">Detección #{selectedDetection.id}</h2>
                  <p className="text-[13px] text-[#8A8C8E] mt-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedDetection.date}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDetection(null)}
                  className="p-2 hover:bg-[#F3F1ED] rounded-xl text-[#8A8C8E] hover:text-[#1A1C1E] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 flex-1">
                <div>
                  <h3 className="text-[13px] font-semibold text-[#2D2F31] mb-3">Daños detectados</h3>
                  <div className="space-y-2.5">
                    {selectedDetection.types.map((t, i) => (
                      <div key={i} className="bg-[#F8F7F5] p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2.5">
                          <span className="text-[13px] font-medium text-[#1A1C1E]">{t.type}</span>
                          <span className="text-[12px] font-semibold text-[#11676A] bg-[#DCEFEF] px-2.5 py-0.5 rounded-md">
                            {t.probability}%
                          </span>
                        </div>
                        <div className="w-full bg-[#E2DFD8] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#11676A] rounded-full"
                            style={{ width: `${t.probability}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[13px] font-semibold text-[#2D2F31] mb-2.5 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#8A8C8E]" />
                    Ubicación en plano
                  </h3>
                  <div className="bg-[#F8F7F5] px-4 py-3 rounded-xl text-[12px] text-[#66686A] font-mono">
                    X: {selectedDetection.x.toFixed(1)} · Y: {selectedDetection.y.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="mt-7 flex gap-2.5 pt-5 border-t border-[#F0EDE8]">
                <button
                  onClick={() => setSelectedDetection(null)}
                  className="flex-1 py-2.5 px-4 bg-[#F3F1ED] hover:bg-[#ECEAE5] text-[#1A1C1E] font-medium text-[13px] rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Map className="w-4 h-4" />
                  Ver en plano
                </button>
                <button className="flex-1 py-2.5 px-4 bg-[#11676A] hover:bg-[#0E5254] text-white font-medium text-[13px] rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Descargar imagen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
