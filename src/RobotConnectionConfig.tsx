import React, { useState } from 'react';
import { TurquoiseCard, PanelTitle, PanelLabel } from './components';
import { ChevronDown, Copy, Check, EthernetPort, Antenna } from 'lucide-react';

// ─── Connection config — Unitree G1 setup (MYBOTSHOP/QUADRUPED official setup) ─

export interface RobotConnectionConfigData {
  network: {
    pcStaticIp: string;
    netmaskPrefix: number;
  };
  robotIps: {
    mcu: string;
    auxPcSsh: string;
    webserver: string;
    lidar: string;
  };
  ssh: {
    user: string;
    password: string;
  };
  webserver: {
    url: string;
    user: string;
    password: string;
  };
  connectivityMode: 'lan' | 'wifi';
  rosDomainId: number;
  robotNamespace: string;
  ros2DriversActive: boolean;
}

// Fixed robot-side addresses — read-only reference, never editable.
const ROBOT_IPS = {
  mcu: '192.168.123.161',
  auxPcSsh: '192.168.123.164',
  webserver: '192.168.123.164:9000',
  lidar: '192.168.123.120',
} as const;

export const defaultConnectionConfig: RobotConnectionConfigData = {
  network: { pcStaticIp: '192.168.123.51', netmaskPrefix: 24 },
  robotIps: ROBOT_IPS,
  ssh: { user: 'unitree', password: '123' },
  webserver: { url: 'http://192.168.123.164:9000/', user: 'x', password: 'mybotshop' },
  connectivityMode: 'wifi',
  rosDomainId: 10,
  robotNamespace: 'g1_unit_001',
  ros2DriversActive: false,
};

/** Blocking — must be resolved before continuing/connecting. */
export function getConnectionErrors(cfg: RobotConnectionConfigData): string[] {
  const errors: string[] = [];
  if (!cfg.webserver.url.trim()) errors.push('Falta la IP/URL del Webserver.');
  if (cfg.rosDomainId === null || cfg.rosDomainId === undefined || Number.isNaN(cfg.rosDomainId)) {
    errors.push('Falta el ROS_DOMAIN_ID.');
  }
  if (!cfg.robotNamespace.trim()) errors.push('Falta el ID/Namespace del robot.');
  if (!cfg.connectivityMode) errors.push('Falta seleccionar el modo de conectividad.');
  return errors;
}

/** Non-blocking — shown as a reminder, doesn't prevent continuing. */
export function getConnectionWarnings(cfg: RobotConnectionConfigData): string[] {
  const warnings: string[] = [];
  if (cfg.connectivityMode === 'wifi') {
    warnings.push('Verificá que el hub/adaptador WiFi esté conectado físicamente al robot.');
  }
  if (cfg.ssh.password === '123' || cfg.webserver.password === 'mybotshop') {
    warnings.push('Estás usando credenciales por defecto — cambialas fuera de un entorno de pruebas.');
  }
  return warnings;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest">{children}</p>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <PanelLabel className="mb-1.5">{label}{required ? ' *' : ''}</PanelLabel>
      {children}
      {hint && <p className="text-[10px] text-[#8A8C8E] mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

function TextField({
  value, onChange, type = 'text', disabled,
}: { value: string; onChange?: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
      className={`w-full px-3 py-2.5 rounded-xl h-[42px] text-[12px] font-semibold text-[#1A1C1E] outline-none transition-colors ${
        disabled ? 'bg-black/5 text-[#8A8C8E] cursor-not-allowed' : 'bg-white/60 hover:bg-white/80 focus:bg-white/90'
      }`}
    />
  );
}

function WarningRow({ tone, children }: { tone: 'error' | 'warning'; children: React.ReactNode }) {
  const styles = tone === 'error'
    ? { bg: 'bg-[#FEF2F2]', text: 'text-[#991B1B]', dot: '#EF4444' }
    : { bg: 'bg-[#FFFBEB]', text: 'text-[#92400E]', dot: '#FBBF24' };
  return (
    <div className={`flex items-start gap-2 px-3.5 py-2.5 rounded-xl ${styles.bg} ${styles.text}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-none mt-1.5" style={{ backgroundColor: styles.dot }} />
      <span className="text-[11px] font-medium leading-snug">{children}</span>
    </div>
  );
}

/** Rendered outside any card, at the very end of the page — collapsed by default. */
export function ConnectionJsonPreview({ config }: { config: RobotConnectionConfigData }) {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setShowJson(s => !s)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-[#377DC0] hover:opacity-70 transition-opacity"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showJson ? 'rotate-180' : ''}`} />
        {showJson ? 'Ocultar' : 'Ver'} JSON de configuración
      </button>
      {showJson && (
        <div className="relative mt-2">
          <pre className="text-[11px] text-[#1A1C1E] bg-black/5 rounded-xl p-3.5 overflow-x-auto whitespace-pre" style={{ fontFamily: 'monospace' }}>
            {JSON.stringify(config, null, 2)}
          </pre>
          <button
            type="button"
            onClick={copyJson}
            className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold text-[#377DC0] bg-white px-2 py-1 rounded-md shadow-sm hover:opacity-80 transition-opacity"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}
    </div>
  );
}

interface RobotConnectionSectionProps {
  config: RobotConnectionConfigData;
  onChange: (cfg: RobotConnectionConfigData) => void;
}

export default function RobotConnectionSection({ config, onChange }: RobotConnectionSectionProps) {
  const errors = getConnectionErrors(config);
  const warnings = getConnectionWarnings(config);
  const patch = (partial: Partial<RobotConnectionConfigData>) => onChange({ ...config, ...partial });

  return (
    <TurquoiseCard size="lg" bordered className="mt-5">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#377DC0]/10">
        <div>
          <PanelTitle>Configuración de conexión</PanelTitle>
          <p className="text-[11px] text-[#8A8C8E] mt-0.5">Setup del robot Unitree G1 — LAN, SSH, Webserver y ROS2</p>
        </div>
        <span className={`flex-none text-[11px] font-semibold px-2.5 py-1 rounded-md ${errors.length ? 'bg-[#FEF2F2] text-[#991B1B]' : 'bg-[#E3EEF8] text-[#14202B]'}`}>
          {errors.length ? 'Incompleto' : 'Completo'}
        </span>
      </div>

      <div className="px-5 py-5 space-y-6">

        {/* ── Acceso SSH ── */}
        <div className="space-y-2.5">
          <SectionLabel>Acceso SSH</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Usuario">
              <TextField value={config.ssh.user} onChange={v => patch({ ssh: { ...config.ssh, user: v } })} />
            </Field>
            <Field label="Contraseña">
              <TextField type="password" value={config.ssh.password} onChange={v => patch({ ssh: { ...config.ssh, password: v } })} />
            </Field>
          </div>
        </div>

        <div className="h-px bg-[#377DC0]/10" />

        {/* ── Webserver ── */}
        <div className="space-y-2.5">
          <SectionLabel>Acceso al Webserver</SectionLabel>
          <Field label="URL">
            <TextField value={config.webserver.url} onChange={v => patch({ webserver: { ...config.webserver, url: v } })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Usuario">
              <TextField value={config.webserver.user} disabled />
            </Field>
            <Field label="Contraseña">
              <TextField type="password" value={config.webserver.password} onChange={v => patch({ webserver: { ...config.webserver, password: v } })} />
            </Field>
          </div>
        </div>

        <div className="h-px bg-[#377DC0]/10" />

        {/* ── Modo de conectividad ── */}
        <div className="space-y-2.5">
          <SectionLabel>Modo de conectividad para operación</SectionLabel>
          <Field label="Conectividad" required>
            <div className="flex bg-white/40 rounded-xl p-1 gap-1">
              {([
                { value: 'wifi', label: 'WiFi (recomendado)', icon: <Antenna className="w-3.5 h-3.5" /> },
                { value: 'lan', label: 'LAN (Ethernet)', icon: <EthernetPort className="w-3.5 h-3.5" /> },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => patch({ connectivityMode: opt.value })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg h-[42px] text-[12px] font-semibold transition-colors ${
                    config.connectivityMode === opt.value
                      ? 'bg-[#377DC0] text-white'
                      : 'text-[#66686A] hover:bg-white/70'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
          <p className="text-[11px] text-[#8A8C8E] leading-relaxed">
            {config.connectivityMode === 'lan'
              ? 'Activá la interfaz eth1 en el robot.'
              : 'Activá la interfaz eth0 en el robot. Requiere un hub/adaptador WiFi conectado físicamente al robot.'}
          </p>
        </div>

        <div className="h-px bg-[#377DC0]/10" />

        {/* ── ROS2 ── */}
        <div className="space-y-2.5">
          <SectionLabel>Identificación ROS2</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ROS_DOMAIN_ID" required hint="Prefijo de todos los comandos ROS2. Debe ser único si hay más de un robot en la red.">
              <TextField type="number" value={String(config.rosDomainId)} onChange={v => patch({ rosDomainId: Number(v) || 0 })} />
            </Field>
            <Field label="ID / Namespace del robot" required hint="Se usa como namespace en tópicos y servicios ROS2.">
              <TextField value={config.robotNamespace} onChange={v => patch({ robotNamespace: v })} />
            </Field>
          </div>
        </div>

        <div className="h-px bg-[#377DC0]/10" />

        {/* ── Drivers ROS2 ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <SectionLabel>Estado de drivers ROS2</SectionLabel>
            <p className="text-[11px] text-[#8A8C8E] mt-1 leading-snug">Vienen apagados por defecto. Se activan desde el Webserver con "Restart All".</p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A8C8E] bg-black/5 px-2.5 py-1 rounded-md flex-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A0A2A4] flex-none" />
            {config.ros2DriversActive ? 'Activos' : 'Apagados'}
          </span>
        </div>

        {/* ── Errors / warnings (grouped, always last — before the page-level action button) ── */}
        {(errors.length > 0 || warnings.length > 0) && (
          <div className="space-y-2 pt-1">
            {errors.map(err => <WarningRow key={err} tone="error">{err}</WarningRow>)}
            {warnings.map(w => <WarningRow key={w} tone="warning">{w}</WarningRow>)}
          </div>
        )}

      </div>
    </TurquoiseCard>
  );
}
