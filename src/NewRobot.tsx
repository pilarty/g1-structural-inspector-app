import React, { useState } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PanelLabel, PrimaryButton, SecondaryButton } from './components';
import RobotConnectionSection, { ConnectionJsonPreview, defaultConnectionConfig } from './RobotConnectionConfig';

function Label({ children }: { children: React.ReactNode }) {
  return <PanelLabel className="mb-1.5">{children}</PanelLabel>;
}

function TextInput({ placeholder, defaultValue }: { placeholder: string; defaultValue?: string }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      defaultValue={defaultValue}
      className="w-full px-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl border border-[#1B6E77]/15 focus:border-[#1B6E77]/40 text-[13px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-colors"
    />
  );
}

interface NewRobotProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCancel: () => void;
}

export default function NewRobot({ activeTab, onTabChange, onCancel }: NewRobotProps) {
  const [connectionConfig, setConnectionConfig] = useState(defaultConnectionConfig);

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">

        <TopNav />

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#F3F1ED]">
          <div className="w-full px-8 py-8">

            {/* Page header */}
            <div className="mb-6">
              <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight">Añadir robot</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1">Registrá un nuevo robot Unitree G1 y configurá su conexión.</p>
            </div>

            <div className="flex items-start gap-6">

              {/* Left — datos del robot */}
              <div className="w-[300px] flex-none space-y-4">
                <div>
                  <Label>Nombre / ID del robot *</Label>
                  <TextInput placeholder="Ej. HR-05 / Unidad 4" />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <TextInput placeholder="Unitree G1" defaultValue="Unitree G1" />
                </div>
              </div>

              {/* Right — configuración de conexión */}
              <div className="flex-1 min-w-0">
                <RobotConnectionSection config={connectionConfig} onChange={setConnectionConfig} />

                <ConnectionJsonPreview config={connectionConfig} />

                {/* Actions */}
                <div className="flex items-center gap-5 pt-6">
                  <PrimaryButton onClick={() => onTabChange('inspeccion')}>Guardar robot</PrimaryButton>
                  <SecondaryButton onClick={onCancel}>Cancelar</SecondaryButton>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
