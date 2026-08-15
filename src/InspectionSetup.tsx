import React, { useState } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav } from './components';
import {
  ChevronDown,
  Wifi, Battery, Check, AlertTriangle, RefreshCw,
  Play, Bot, Calendar, Clock,
} from 'lucide-react';

type RobotStatus = 'listo' | 'espera' | 'desconectado';

const statusConfig: Record<RobotStatus, { label: string; dot: string; chip: string }> = {
  listo:        { label: 'Listo',               dot: '#10B981', chip: 'bg-[#DCEFEF] text-[#0B5559]' },
  espera:       { label: 'Conectado en espera', dot: '#FBBF24', chip: 'bg-[#FFFBEB] text-[#92400E]' },
  desconectado: { label: 'Desconectado',        dot: '#EF4444', chip: 'bg-[#FEF2F2] text-[#991B1B]' },
};

interface InspectionSetupProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export default function InspectionSetup({ activeTab, onTabChange }: InspectionSetupProps) {
  const [robotStatus, setRobotStatus] = useState<RobotStatus>('listo');

  const status = statusConfig[robotStatus];
  const canStart = robotStatus === 'listo';
  const sensorsOk = robotStatus !== 'desconectado';

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">

        <TopNav />

        {/* Content area */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            backgroundColor: '#F3F1ED',
            backgroundImage: `linear-gradient(rgba(229,231,235,0.17) 1px, transparent 1px), linear-gradient(90deg, rgba(229,231,235,0.17) 1px, transparent 1px)`,
            backgroundSize: '22px 22px',
          }}
        >
          <div className="max-w-[560px] mx-auto px-6 py-8">

            {/* Page header */}
            <div className="mb-6">
              <h1 className="text-[20px] font-bold text-[#1A1C1E] tracking-tight leading-tight">Iniciar inspección</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1">Verificá el estado del robot y configurá los parámetros antes de comenzar.</p>
            </div>

            {/* Dev state toggle */}
            <div className="flex items-center gap-1.5 mb-5 text-[11px] text-[#8A8C8E]">
              <span className="mr-1">Estado:</span>
              {(['listo', 'espera', 'desconectado'] as RobotStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setRobotStatus(s)}
                  className={`px-2.5 py-0.5 rounded-md transition-colors ${
                    robotStatus === s
                      ? 'bg-[#11676A]/15 text-[#0B5559] font-semibold'
                      : 'hover:bg-[#11676A]/8 text-[#8A8C8E]'
                  }`}
                >
                  {statusConfig[s].label}
                </button>
              ))}
            </div>

            <div className="space-y-4">

              {/* ── Card: Estado del robot ── */}
              <div className="bg-[#11676A]/[0.07] border border-[#11676A]/20 backdrop-blur-md rounded-2xl overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-[#11676A]/10 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1A1C1E] flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#11676A]" />
                    Estado del robot
                  </span>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${status.chip}`}>
                    {status.label}
                  </span>
                </div>

                <div className="px-5 py-4 space-y-4">

                  {/* Robot ID + battery */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: status.dot }} />
                      <span className="text-[14px] font-semibold text-[#1A1C1E]">HR-04 / Unidad 2</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-[#10B981]" />
                      <div className="w-14 h-1.5 bg-black/8 rounded-full overflow-hidden">
                        <div className="h-full bg-[#10B981] rounded-full" style={{ width: '84%' }} />
                      </div>
                      <span className="text-[11px] font-semibold text-[#10B981]">84%</span>
                    </div>
                  </div>

                  {/* Sensor rows */}
                  <div className="space-y-2.5">
                    {[
                      { label: 'Cámara de profundidad' },
                      { label: 'LiDAR 3D' },
                    ].map(sensor => (
                      <div key={sensor.label} className="flex items-center gap-2.5">
                        {sensorsOk ? (
                          <Check className="w-3.5 h-3.5 text-[#10B981] flex-none" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] flex-none" />
                        )}
                        <span className="text-[12px] text-[#1A1C1E] flex-1">{sensor.label}</span>
                        <span className={`text-[11px] font-semibold ${sensorsOk ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                          {sensorsOk ? 'OK' : 'Sin señal'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Network */}
                  <div className="pt-3 border-t border-[#11676A]/10 flex items-center gap-1.5 text-[11px]">
                    <Wifi className="w-3 h-3 flex-none text-[#8A8C8E]" />
                    {robotStatus !== 'desconectado' ? (
                      <span className="text-[#8A8C8E]">
                        Conectado vía WiFi 6 — <span className="font-medium text-[#66686A]">Red_Obra_01</span>
                      </span>
                    ) : (
                      <span className="text-[#EF4444]">Sin conexión de red detectada</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Card: Configuración del relevamiento ── */}
              <div className="bg-[#11676A]/[0.07] border border-[#11676A]/20 backdrop-blur-md rounded-2xl overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-[#11676A]/10">
                  <span className="text-[13px] font-semibold text-[#1A1C1E]">Configuración del relevamiento</span>
                </div>

                <div className="px-5 py-4 space-y-4">

                  {/* Building selector */}
                  <div>
                    <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1.5">Edificio</p>
                    <button className="w-full flex items-center justify-between px-4 py-2.5 bg-white/60 hover:bg-white/80 transition-colors rounded-xl border border-[#11676A]/15 text-left">
                      <div>
                        <p className="text-[13px] font-semibold text-[#1A1C1E]">Edificio Corrientes 1234</p>
                        <p className="text-[11px] text-[#8A8C8E] mt-0.5">Av. Corrientes 1234, CABA · Planta 1</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-[#8A8C8E] flex-none ml-3" />
                    </button>
                  </div>

                  {/* Robot (read-only) */}
                  <div>
                    <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1.5">Robot asignado</p>
                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/40 rounded-xl border border-[#11676A]/10">
                      <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: status.dot }} />
                      <span className="text-[13px] font-medium text-[#1A1C1E]">HR-04 / Unidad 2</span>
                      <span className="ml-auto text-[11px] text-[#8A8C8E]">{status.label}</span>
                    </div>
                  </div>

                  {/* Date + time */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1.5">Fecha</p>
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/60 rounded-xl border border-[#11676A]/15">
                        <Calendar className="w-3.5 h-3.5 text-[#8A8C8E] flex-none" />
                        <span className="text-[13px] text-[#1A1C1E]">15 ago 2026</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1.5">Hora estimada</p>
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/60 rounded-xl border border-[#11676A]/15">
                        <Clock className="w-3.5 h-3.5 text-[#8A8C8E] flex-none" />
                        <span className="text-[13px] text-[#1A1C1E]">09:00</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Warning — disconnected only */}
              {robotStatus === 'desconectado' && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-[#FEF2F2] border border-[#EF4444]/20 rounded-xl">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] flex-none" />
                  <span className="text-[12px] font-medium text-[#991B1B]">Robot no detectado en la red.</span>
                  <button
                    onClick={() => {}}
                    className="ml-auto flex items-center gap-1 text-[12px] font-semibold text-[#11676A] hover:opacity-70 transition-opacity whitespace-nowrap"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reintentar conexión
                  </button>
                </div>
              )}

              {/* Primary action */}
              <button
                disabled={!canStart}
                onClick={() => canStart && onTabChange('inspeccion-en-curso')}
                className={`w-full py-3.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors ${
                  canStart
                    ? 'bg-[#11676A] text-white hover:bg-[#0E5254]'
                    : 'bg-[#E2DFD8] text-[#A0A2A4] cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4" />
                Iniciar configuración
              </button>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
