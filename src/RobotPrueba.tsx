import React, { useState } from 'react';
import { Check, X, Minus, Clock, Loader2, Circle, Download, Plug, Pencil, ShieldAlert, Bot } from 'lucide-react';
import { TurquoiseCard, PanelTitle, PrimaryButton } from './components';
import type { EstadoPaso, IdPaso, Paso, ResultadoPrueba } from './robotConexion';
import type { RobotNube } from './robots';

// ─── Pasos de la prueba ───────────────────────────────────────────────────────

export const PASOS_BASE: Paso[] = ([
  ['red', 'Red', 3], ['ssh', 'SSH', 6], ['dds', 'DDS', 5], ['camara', 'Cámara', 8],
] as [IdPaso, string, number][]).map(([id, nombre, limite_s]) => ({ id, nombre, limite_s, estado: 'espera' }));

const ICONO: Record<EstadoPaso, { icono: React.ReactNode; color: string; texto: string }> = {
  espera:    { icono: <Circle className="w-3 h-3" />,                 color: 'text-[#A0A2A4] bg-black/5',     texto: 'Sin probar' },
  en_curso:  { icono: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: 'text-[#377DC0] bg-[#E3EEF8]', texto: 'Probando…' },
  ok:        { icono: <Check className="w-3.5 h-3.5" />,              color: 'text-[#065F46] bg-[#ECFDF5]',   texto: 'Correcto' },
  error:     { icono: <X className="w-3.5 h-3.5" />,                  color: 'text-[#991B1B] bg-[#FEF2F2]',   texto: 'Falló' },
  omitido:   { icono: <Minus className="w-3.5 h-3.5" />,              color: 'text-[#8A8C8E] bg-black/5',     texto: 'Omitido' },
  pendiente: { icono: <Clock className="w-3.5 h-3.5" />,              color: 'text-[#92400E] bg-[#FFFBEB]',   texto: 'Pendiente' },
};

export function ListaPasos({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="space-y-1.5">
      {pasos.map(p => {
        const e = ICONO[p.estado];
        return (
          <li key={p.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-white/50">
            <span className={`flex-none w-6 h-6 rounded-full flex items-center justify-center ${e.color}`} aria-hidden>{e.icono}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-semibold text-[#1A1C1E]">{p.nombre}</span>
                <span className="text-[10px] font-medium text-[#8A8C8E] flex-none">
                  {p.estado === 'en_curso' && p.limite_s ? `límite ${p.limite_s} s` : p.ms !== undefined ? `${(p.ms / 1000).toFixed(1)} s` : e.texto}
                </span>
              </div>
              {p.mensaje && (
                <p className={`text-[11px] leading-snug mt-0.5 ${p.estado === 'error' ? 'text-[#991B1B]' : 'text-[#66686A]'}`}>{p.mensaje}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// ─── Panel "Probar conexión" ──────────────────────────────────────────────────

export function PanelPrueba({ prueba, probando, puedeProbar, motivoNoProbar, onProbar, onExportar }: {
  prueba: ResultadoPrueba | null;
  probando: boolean;
  puedeProbar: boolean;
  motivoNoProbar?: string;
  onProbar: () => void;
  onExportar: () => void;
}) {
  const pasos = prueba?.pasos.length ? prueba.pasos : PASOS_BASE;
  return (
    <TurquoiseCard size="lg" bordered>
      <div className="px-5 pt-4 pb-3 border-b border-[#377DC0]/10">
        <PanelTitle>Probar conexión</PanelTitle>
        <p className="text-[11px] text-[#8A8C8E] mt-0.5">Comprueba cada canal en orden. Nunca envía órdenes de movimiento.</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <PrimaryButton variant="full" onClick={onProbar} disabled={!puedeProbar || probando}
          icon={probando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}>
          {probando ? 'Probando…' : prueba ? 'Volver a probar' : 'Probar conexión'}
        </PrimaryButton>
        {!puedeProbar && motivoNoProbar && <p className="text-[11px] text-[#8A8C8E] leading-snug">{motivoNoProbar}</p>}

        {prueba && !probando && (
          <p className={`text-[11px] font-semibold ${prueba.resultado === 'ok' ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>
            {prueba.resultado === 'ok' ? 'Todos los canales respondieron' : 'Hay canales con fallos'}
            <span className="font-normal text-[#8A8C8E]"> · {fechaCorta(prueba.fecha)}
              {prueba.interfaz ? ` · ${prueba.interfaz.nombre} (${prueba.interfaz.ip})` : ' · sin interfaz detectada'}</span>
          </p>
        )}

        <ListaPasos pasos={pasos} />

        <button
          type="button"
          onClick={onExportar}
          disabled={!prueba || probando}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#377DC0] hover:opacity-70 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar registro de diagnóstico
        </button>
      </div>
    </TurquoiseCard>
  );
}

// ─── Robots guardados ─────────────────────────────────────────────────────────

export function RobotsGuardados({ robots, cargando, error, seleccionado, conectandoId, onConectar, onEditar, onNuevo }: {
  robots: RobotNube[];
  cargando: boolean;
  error: string | null;
  seleccionado: string | null;
  conectandoId: string | null;
  onConectar: (r: RobotNube) => void;
  onEditar: (r: RobotNube) => void;
  onNuevo: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-semibold text-[#8A8C8E] uppercase tracking-widest">Robots guardados</p>
        <button type="button" onClick={onNuevo} className="text-[11px] font-semibold text-[#377DC0] hover:opacity-70">+ Nuevo</button>
      </div>
      {cargando && <p className="text-[12px] text-[#8A8C8E]">Cargando…</p>}
      {error && <p className="text-[12px] text-[#991B1B]">{error}</p>}
      {!cargando && !error && robots.length === 0 && <p className="text-[12px] text-[#8A8C8E]">Todavía no guardaste ningún robot.</p>}
      <ul className="space-y-1.5">
        {robots.map(r => (
          <li key={r.id} className={`rounded-xl px-3 py-2.5 ${seleccionado === r.id ? 'bg-[#E3EEF8]' : 'bg-black/[0.03]'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="w-3.5 h-3.5 text-[#377DC0] flex-none" />
              <span className="text-[12px] font-semibold text-[#1A1C1E] truncate flex-1">{r.label}</span>
              {r.ultimaPruebaResultado && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-none"
                  style={{ backgroundColor: r.ultimaPruebaResultado === 'ok' ? '#10B981' : '#EF4444' }}
                  title={`Última prueba: ${r.ultimaPruebaResultado === 'ok' ? 'correcta' : 'con fallos'}`}
                />
              )}
            </div>
            <p className="text-[10px] text-[#8A8C8E] mt-0.5 truncate">
              {r.conexion ? `${r.conexion.host} · DDS ${r.conexion.dds_domain_id}` : 'Sin perfil de conexión'}
              {r.ultimaPruebaFecha ? ` · ${fechaCorta(r.ultimaPruebaFecha)}` : ''}
            </p>
            <div className="flex gap-3 mt-1.5">
              {r.conexion && (
                <button type="button" onClick={() => onConectar(r)} disabled={conectandoId !== null}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#377DC0] hover:opacity-70 disabled:opacity-40">
                  {conectandoId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
                  Conectar
                </button>
              )}
              <button type="button" onClick={() => onEditar(r)}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#66686A] hover:text-[#1A1C1E]">
                <Pencil className="w-3 h-3" />
                {r.conexion ? 'Editar' : 'Configurar'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Reconexión ───────────────────────────────────────────────────────────────

export function DialogoReconexion({ robot, prueba, conectando, autorizado, onEditar, onAutorizar, onCerrar }: {
  robot: RobotNube;
  prueba: ResultadoPrueba | null;
  conectando: boolean;
  autorizado: boolean;
  onEditar: () => void;
  onAutorizar: (c: { espacio_despejado: boolean; soporte_seguridad: boolean; operador_con_control: boolean }) => Promise<void>;
  onCerrar: () => void;
}) {
  const [c, setC] = useState({ espacio_despejado: false, soporte_seguridad: false, operador_con_control: false });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fallo = prueba?.pasos.find(p => p.estado === 'error');
  const ok = !conectando && prueba?.resultado === 'ok';
  const todas = c.espacio_despejado && c.soporte_seguridad && c.operador_con_control;

  async function autorizar() {
    setEnviando(true);
    setError(null);
    try {
      await onAutorizar(c);
    } catch {
      setError('No se pudo registrar la confirmación. Volvé a conectar el robot.');
    } finally {
      setEnviando(false);
    }
  }

  const casilla = (clave: keyof typeof c, texto: string) => (
    <label className="flex items-start gap-2 text-[12px] text-[#1A1C1E] cursor-pointer">
      <input type="checkbox" checked={c[clave]} onChange={e => setC({ ...c, [clave]: e.target.checked })} className="mt-0.5 accent-[#377DC0]" />
      {texto}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={`Conectar ${robot.label}`}>
      <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.16)] overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-black/5">
          <PanelTitle>Conectar {robot.label}</PanelTitle>
          <p className="text-[11px] text-[#8A8C8E] mt-0.5">Comprobación rápida con el perfil guardado. La interfaz de red se vuelve a detectar.</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <ListaPasos pasos={prueba?.pasos.length ? prueba.pasos : PASOS_BASE.filter(p => ['red', 'ssh', 'dds'].includes(p.id))} />

          {!conectando && fallo && (
            <div className="px-3.5 py-2.5 rounded-xl bg-[#FEF2F2] text-[#991B1B] text-[11px] font-medium leading-snug">
              Falló el paso «{fallo.nombre}». Revisá el perfil y volvé a intentar.
            </div>
          )}

          {ok && !autorizado && (
            <div className="space-y-2.5 px-3.5 py-3 rounded-xl bg-[#FFFBEB]">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#92400E]">
                <ShieldAlert className="w-4 h-4" /> Robot conectado y en reposo
              </p>
              <p className="text-[11px] text-[#92400E] leading-snug">
                La app no envió ninguna orden de movimiento. Para permitirlas, confirmá:
              </p>
              {casilla('espacio_despejado', 'El robot está en un espacio despejado.')}
              {casilla('soporte_seguridad', 'Está colgado del soporte de seguridad.')}
              {casilla('operador_con_control', 'Hay alguien a su lado con el control remoto.')}
              {error && <p className="text-[11px] text-[#991B1B]">{error}</p>}
            </div>
          )}
          {ok && autorizado && (
            <p className="text-[12px] font-semibold text-[#065F46]">Robot conectado. Movimiento autorizado para esta sesión.</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-4 px-5 pb-4">
          {!conectando && fallo && (
            <button type="button" onClick={onEditar} className="text-[13px] font-semibold text-[#377DC0] hover:opacity-70">Editar perfil</button>
          )}
          <button type="button" onClick={onCerrar} className="text-[13px] font-medium text-[#8A8C8E] hover:text-[#1A1C1E]">
            {conectando ? 'Cancelar' : 'Cerrar'}
          </button>
          {ok && !autorizado && (
            <PrimaryButton onClick={autorizar} disabled={!todas || enviando}>
              {enviando ? 'Confirmando…' : 'Permitir movimiento'}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
