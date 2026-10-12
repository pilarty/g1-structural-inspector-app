import React, { useState } from 'react';
import { BACKEND_URL } from './sesion';
import { marcarConexionConfigurada } from './robots';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PanelLabel, PrimaryButton, SecondaryButton } from './components';
import RobotConnectionSection, { ConnectionJsonPreview, defaultConnectionConfig } from './RobotConnectionConfig';

function Label({ children }: { children: React.ReactNode }) {
  return <PanelLabel className="mb-1.5">{children}</PanelLabel>;
}

function TextInput({ placeholder, defaultValue, value, onChange }: { placeholder: string; defaultValue?: string; value?: string; onChange?: (v: string) => void }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      defaultValue={value === undefined ? defaultValue : undefined}
      value={value}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      className="w-full px-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl border border-[#377DC0]/15 focus:border-[#377DC0]/40 text-[13px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-colors"
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
  const [codigo, setCodigo] = useState('');
  const [modelo, setModelo] = useState('Unitree G1');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!codigo.trim() || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/nube/api/robots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigo.trim(), unidad: modelo.trim() || 'Unitree G1', estado: 'activo' }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const creado = await res.json();
      // La conexión se guarda solo en esta PC y sin contraseñas.
      marcarConexionConfigurada(creado.id, {
        ...connectionConfig,
        ssh: { user: connectionConfig.ssh.user },
        webserver: { url: connectionConfig.webserver.url, user: connectionConfig.webserver.user },
      });
      onTabChange('inspeccion');
    } catch {
      setError('No se pudo guardar el robot. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">

        <TopNav />

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#FFFFFF]">
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
                  <TextInput placeholder="Ej. HR-05 / Unidad 4" value={codigo} onChange={setCodigo} />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <TextInput placeholder="Unitree G1" value={modelo} onChange={setModelo} />
                </div>
              </div>

              {/* Right — configuración de conexión */}
              <div className="flex-1 min-w-0">
                <RobotConnectionSection config={connectionConfig} onChange={setConnectionConfig} />

                <ConnectionJsonPreview config={connectionConfig} />

                {/* Actions */}
                <div className="flex items-center gap-5 pt-6">
                  <PrimaryButton onClick={guardar} disabled={guardando || !codigo.trim()}>{guardando ? 'Guardando…' : 'Guardar robot'}</PrimaryButton>
                  {error && <p className="text-[12px] text-[#991B1B]">{error}</p>}
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
