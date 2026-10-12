import React, { useState } from 'react';
import { TurquoiseCard, PanelTitle, PanelLabel } from './components';
import { ChevronDown, Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import {
  DDS_DOMAIN_MAX,
  type CampoForm, type Errores, type EstadoRobot, type InterfazRed, type RobotForm,
} from './robotConexion';

// ─── Configuración de conexión — Unitree G1 ──────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest">{children}</p>;
}

function Field({ label, hint, required, error, children }: {
  label: string; hint?: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <PanelLabel className="mb-1.5">{label}{required ? ' *' : ''}</PanelLabel>
      {children}
      {error
        ? <p className="text-[10px] text-[#991B1B] font-medium mt-1 leading-snug">{error}</p>
        : hint && <p className="text-[10px] text-[#8A8C8E] mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

const claseCampo = (error?: string, disabled?: boolean) =>
  `w-full px-3 py-2.5 rounded-xl h-[42px] text-[12px] font-semibold text-[#1A1C1E] outline-none transition-colors border ${
    error ? 'border-[#EF4444]/50' : 'border-transparent'
  } ${disabled ? 'bg-black/5 text-[#8A8C8E] cursor-not-allowed' : 'bg-white/60 hover:bg-white/80 focus:bg-white/90'}`;

function TextField({ value, onChange, onBlur, type = 'text', placeholder, error, inputMode }: {
  value: string; onChange: (v: string) => void; onBlur?: () => void; type?: string; placeholder?: string;
  error?: string; inputMode?: 'numeric' | 'text';
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      autoComplete={type === 'password' ? 'new-password' : 'off'}
      spellCheck={false}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      aria-invalid={!!error}
      className={`${claseCampo(error)} placeholder:text-[#A0A2A4] placeholder:font-normal`}
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

const Divisor = () => <div className="h-px bg-[#377DC0]/10" />;

/** Desplegado al pie de la página; las contraseñas ya llegan enmascaradas. */
export function ConnectionJsonPreview({ datos }: { datos: object }) {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const texto = JSON.stringify(datos, null, 2);

  const copyJson = async () => {
    await navigator.clipboard.writeText(texto);
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
            {texto}
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

const ESTILO_ESTADO: Record<EstadoRobot, { texto: string; chip: string; dot: string }> = {
  recibiendo:  { texto: 'Recibiendo',  chip: 'bg-[#ECFDF5] text-[#065F46]', dot: '#10B981' },
  sin_datos:   { texto: 'Sin datos',   chip: 'bg-[#FFFBEB] text-[#92400E]', dot: '#FBBF24' },
  desconocido: { texto: 'Desconocido', chip: 'bg-black/5 text-[#66686A]',   dot: '#A0A2A4' },
};

interface RobotConnectionSectionProps {
  form: RobotForm;
  onChange: (cambio: Partial<RobotForm>) => void;
  /** Errores a la vista (solo de campos tocados, o todos tras intentar guardar) */
  errores: Errores;
  onBlur: (campo: CampoForm) => void;
  completo: boolean;
  avisos: string[];
  editando: boolean;
  interfaces: InterfazRed[] | null;
  detectandoInterfaces: boolean;
  onDetectarInterfaces: () => void;
  estadoRobot: { estado: EstadoRobot; mensaje?: string; cargando: boolean };
  onRefrescarEstado: () => void;
}

export default function RobotConnectionSection({
  form, onChange, errores, onBlur, completo, avisos, editando,
  interfaces, detectandoInterfaces, onDetectarInterfaces, estadoRobot, onRefrescarEstado,
}: RobotConnectionSectionProps) {
  const campo = (c: CampoForm, extra: { type?: string; placeholder?: string; inputMode?: 'numeric' } = {}) => (
    <TextField
      value={String(form[c])}
      onChange={v => onChange({ [c]: v } as Partial<RobotForm>)}
      onBlur={() => onBlur(c)}
      error={errores[c]}
      {...extra}
    />
  );
  const clave = editando ? 'Sin cambios' : '';
  const estilo = ESTILO_ESTADO[estadoRobot.estado];
  const interfazElegida = interfaces?.find(i => i.nombre === form.interfaz);

  return (
    <TurquoiseCard size="lg" bordered>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#377DC0]/10">
        <div>
          <PanelTitle>Configuración de conexión</PanelTitle>
          <p className="text-[11px] text-[#8A8C8E] mt-0.5">Red, SSH y DDS del Unitree G1 · conexión por cable</p>
        </div>
        <span className={`flex-none text-[11px] font-semibold px-2.5 py-1 rounded-md ${completo ? 'bg-[#E3EEF8] text-[#14202B]' : 'bg-[#FEF2F2] text-[#991B1B]'}`}>
          {completo ? 'Completo' : 'Incompleto'}
        </span>
      </div>

      <div className="px-5 py-5 space-y-6">

        {/* ── Datos generales ── */}
        <div className="space-y-2.5">
          <SectionLabel>Datos generales</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre / ID del robot" required error={errores.codigo} hint="Único entre tus robots.">
              {campo('codigo', { placeholder: 'Ej. HR-05 / Unidad 4' })}
            </Field>
            <Field label="Modelo">
              <select
                value={form.modelo}
                onChange={() => onChange({ modelo: 'Unitree G1' })}
                className={claseCampo()}
              >
                <option value="Unitree G1">Unitree G1</option>
              </select>
            </Field>
          </div>
        </div>

        <Divisor />

        {/* ── Conexión de red ── */}
        <div className="space-y-2.5">
          <SectionLabel>Conexión de red</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="IP o host del robot"
              required
              error={errores.host}
              hint="El G1 usa siempre 192.168.123.164."
            >
              {campo('host', { placeholder: '192.168.123.164' })}
            </Field>
            <Field
              label="Interfaz de red de esta PC"
              hint={interfazElegida ? `IP ${interfazElegida.ips.join(', ')}` : 'Se detecta sola al conectar si no elegís ninguna.'}
            >
              <div className="flex gap-2">
                <select
                  value={form.interfaz}
                  onChange={e => onChange({ interfaz: e.target.value })}
                  className={`${claseCampo()} min-w-0`}
                >
                  <option value="">Detectar automáticamente</option>
                  {(interfaces ?? []).map(i => (
                    <option key={i.nombre} value={i.nombre}>
                      {i.nombre} — {i.ips[0]}{i.activa ? '' : ' (desconectada)'}
                    </option>
                  ))}
                  {form.interfaz && interfaces && !interfazElegida && (
                    <option value={form.interfaz}>{form.interfaz} (no encontrada)</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={onDetectarInterfaces}
                  disabled={detectandoInterfaces}
                  title="Volver a detectar interfaces"
                  aria-label="Volver a detectar interfaces"
                  className="flex-none w-[42px] h-[42px] flex items-center justify-center rounded-xl bg-white/60 hover:bg-white/90 text-[#377DC0] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${detectandoInterfaces ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </Field>
          </div>
          <p className="text-[11px] text-[#8A8C8E] leading-relaxed">
            Conectá esta PC al robot con un cable de red y poné en esa tarjeta una IP fija 192.168.123.51,
            máscara 255.255.255.0. No uses .161, .164 ni .120: ya las usa el robot.
          </p>
        </div>

        <Divisor />

        {/* ── Acceso SSH ── */}
        <div className="space-y-2.5">
          <SectionLabel>Acceso SSH</SectionLabel>
          <div className="grid grid-cols-[1fr_1fr_100px] gap-3">
            <Field label="Usuario" required error={errores.sshUsuario}>{campo('sshUsuario')}</Field>
            <Field label="Contraseña">{campo('sshPassword', { type: 'password', placeholder: clave })}</Field>
            <Field label="Puerto" error={errores.sshPuerto}>{campo('sshPuerto', { inputMode: 'numeric' })}</Field>
          </div>
        </div>

        <Divisor />

        {/* ── DDS ── */}
        <div className="space-y-2.5">
          <SectionLabel>DDS del SDK de Unitree</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Domain ID" required error={errores.ddsDomainId} hint={`0 con un G1 real. Entre 0 y ${DDS_DOMAIN_MAX}.`}>
              {campo('ddsDomainId', { inputMode: 'numeric' })}
            </Field>
          </div>
        </div>

        <Divisor />

        {/* ── Estado del robot ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <SectionLabel>Estado del robot</SectionLabel>
            <p className="text-[11px] text-[#8A8C8E] mt-1 leading-snug">
              {estadoRobot.mensaje ?? 'Se lee del robot: indica si está enviando el estado de sus motores por DDS.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md ${estilo.chip}`}>
              {estadoRobot.cargando
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: estilo.dot }} />}
              {estadoRobot.cargando ? 'Consultando…' : estilo.texto}
            </span>
            <button
              type="button"
              onClick={onRefrescarEstado}
              disabled={estadoRobot.cargando}
              title="Refrescar estado del robot"
              aria-label="Refrescar estado del robot"
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#377DC0] hover:bg-white/70 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${estadoRobot.cargando ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {avisos.length > 0 && (
          <div className="space-y-2 pt-1">
            {avisos.map(w => <WarningRow key={w} tone="warning">{w}</WarningRow>)}
          </div>
        )}

      </div>
    </TurquoiseCard>
  );
}
