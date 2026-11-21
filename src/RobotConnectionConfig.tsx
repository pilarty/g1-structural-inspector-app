import React, { useState } from 'react';
import { PanelTitle, PanelLabel } from './components';
import { tarjetaBlanca } from './tokens';
import { ChevronDown, RefreshCw } from 'lucide-react';
import {
  DDS_DOMAIN_MAX, MODELO_SIMULADOR,
  type Avisos, type CampoForm, type Errores, type InterfazRed, type RobotForm,
} from './robotConexion';

// Configuración de conexión — Unitree G1

/** Bloque del formulario: título y una línea que explica para qué sirve. */
function Seccion({ titulo, descripcion, children }: {
  titulo: string; descripcion: string; children: React.ReactNode;
}) {
  return (
    <section className="px-6 py-5">
      <div className="mb-4">
        <h3 className="text-[13px] font-bold text-[#1A1C1E] leading-tight">{titulo}</h3>
        <p className="text-[11px] text-[#8A8C8E] mt-0.5 leading-snug">{descripcion}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, required, error, aviso, children }: {
  label: string; hint?: string; required?: boolean; error?: string; aviso?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <PanelLabel className="mb-1.5">{label}{required ? ' *' : ''}</PanelLabel>
      {children}
      {error
        ? <p className="text-[10px] text-[#991B1B] font-medium mt-1 leading-snug">{error}</p>
        : aviso
          ? <p className="text-[10px] text-[#92400E] font-medium mt-1 leading-snug">{aviso}</p>
          : hint && <p className="text-[10px] text-[#8A8C8E] mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

const claseCampo = (error?: string) =>
  `w-full px-3 rounded-md h-[42px] text-[12px] font-semibold text-[#1A1C1E] bg-[#F8FAFC] focus:bg-white outline-none transition-shadow border ${
    error
      ? 'border-[#EF4444]/60 focus:ring-2 focus:ring-[#EF4444]/15'
      : 'border-[#377DC0]/15 hover:border-[#377DC0]/35 focus:border-[#377DC0] focus:ring-2 focus:ring-[#377DC0]/15'
  }`;

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

interface RobotConnectionSectionProps {
  form: RobotForm;
  onChange: (cambio: Partial<RobotForm>) => void;
  /** Errores a la vista (solo de campos tocados, o todos tras intentar guardar) */
  errores: Errores;
  onBlur: (campo: CampoForm) => void;
  /** Advertencias que no impiden guardar, debajo de su campo */
  avisos: Avisos;
  editando: boolean;
  interfaces: InterfazRed[] | null;
  detectandoInterfaces: boolean;
  onDetectarInterfaces: () => void;
  /** Pie de la tarjeta: botones Guardar / Cancelar y mensajes */
  pie: React.ReactNode;
}

export default function RobotConnectionSection({
  form, onChange, errores, onBlur, avisos, editando,
  interfaces, detectandoInterfaces, onDetectarInterfaces, pie,
}: RobotConnectionSectionProps) {
  const [avanzadas, setAvanzadas] = useState(!!form.interfaz);
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
  const interfazElegida = interfaces?.find(i => i.nombre === form.interfaz);

  return (
    <div className={tarjetaBlanca}>
      <div className="px-6 pt-5 pb-4 border-b border-[#14202B]/[0.06]">
        <div>
          <PanelTitle>Configuración de conexión</PanelTitle>
          <p className="text-[11px] text-[#8A8C8E] mt-0.5">{form.simulador ? 'Robot simulado en MuJoCo' : 'Unitree G1 conectado por cable a esta PC'}</p>
        </div>
      </div>

      <div className="divide-y divide-[#14202B]/[0.06]">

        <Seccion titulo="Robot" descripcion="Cómo lo vas a reconocer en la app.">
          <div className="grid grid-cols-[1fr_180px] gap-4">
            <Field label="Nombre" required error={errores.codigo} hint="Único entre tus robots.">
              {campo('codigo', { placeholder: 'Ej. G1 laboratorio' })}
            </Field>
            <Field label="Modelo">
              <p className="h-[42px] flex items-center text-[12px] font-semibold text-[#1A1C1E]">{form.simulador ? MODELO_SIMULADOR : form.modelo}</p>
            </Field>
          </div>
          <div className="mt-4">
            <PanelLabel className="mb-1.5">Tipo</PanelLabel>
            <div className="inline-flex rounded-[3px] border border-[#D4D4D4] overflow-hidden">
              {([[false, 'Robot real'], [true, 'Es un simulador']] as [boolean, string][]).map(([v, et]) => (
                <button key={et} type="button" onClick={() => onChange({ simulador: v })} aria-pressed={form.simulador === v}
                  className={`h-9 px-4 text-[13px] font-medium transition-colors ${form.simulador === v ? 'bg-[#377DC0] text-white' : 'bg-white text-[#1A1C1E] hover:bg-[#F3F4F6]'}`}>
                  {et}
                </button>
              ))}
            </div>
            {form.simulador && (
              <p className="text-[12px] text-[#66686A] mt-2 leading-snug">
                No necesita datos de conexión: las fotos y la posición las manda el script de MuJoCo directo al backend de esta PC.
              </p>
            )}
          </div>
        </Seccion>

        {!form.simulador && (<>

        <Seccion
          titulo="Red"
          descripcion="Conectá esta PC al robot con un cable y poné en esa tarjeta la IP fija 192.168.123.51, máscara 255.255.255.0."
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="IP del robot" required error={errores.host} hint="El G1 usa siempre 192.168.123.164.">
              {campo('host', { placeholder: '192.168.123.164' })}
            </Field>
      </div>

          <button
            type="button"
            onClick={() => setAvanzadas(a => !a)}
            className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#377DC0] hover:opacity-70 transition-opacity"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${avanzadas ? 'rotate-180' : ''}`} />
            Opciones avanzadas
            {!avanzadas && <span className="font-normal text-[#8A8C8E]">· tarjeta de red: {form.interfaz || 'automática'}</span>}
          </button>
          {avanzadas && (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Field
                label="Tarjeta de red de esta PC"
                hint={interfazElegida
                  ? `IP ${interfazElegida.ips.join(', ')}`
                  : 'Por qué conexión de tu PC (cable o WiFi) se habla con el robot. En automático se elige la del cable al robot.'}
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
                    title="Volver a detectar tarjetas de red"
                    aria-label="Volver a detectar tarjetas de red"
                    className="flex-none w-[42px] h-[42px] flex items-center justify-center rounded-md bg-[#F8FAFC] border border-[#377DC0]/15 hover:border-[#377DC0]/35 text-[#377DC0] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${detectandoInterfaces ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </Field>
            </div>
          )}
        </Seccion>

        <Seccion titulo="Acceso SSH" descripcion="Usuario y contraseña de la computadora del robot.">
          <div className="grid grid-cols-[1fr_1fr_110px] gap-4">
            <Field label="Usuario" required error={errores.sshUsuario}>{campo('sshUsuario')}</Field>
            <Field label="Contraseña">{campo('sshPassword', { type: 'password', placeholder: clave })}</Field>
            <Field label="Puerto" error={errores.sshPuerto}>{campo('sshPuerto', { inputMode: 'numeric' })}</Field>
          </div>
        </Seccion>

        <Seccion titulo="DDS" descripcion="Canal por el que el robot envía el estado de sus motores.">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Domain ID"
              required
              error={errores.ddsDomainId}
              aviso={avisos.ddsDomainId}
              hint={`0 con un G1 real. Entre 0 y ${DDS_DOMAIN_MAX}.`}
            >
              {campo('ddsDomainId', { inputMode: 'numeric' })}
            </Field>
          </div>
        </Seccion>
        </>)}

      </div>

      <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#14202B]/[0.06]">{pie}</div>
    </div>
  );
}
