import React, { useState } from 'react';
import { Check, X, Minus, Clock, Loader2, Circle, Plug, Pencil, ShieldAlert, Bot, Plus, Trash2 } from 'lucide-react';
import { PanelTitle, PrimaryButton } from './components';
import { tarjetaBlanca } from './tokens';
import { MODELO_SIMULADOR, type EstadoPaso, type IdPaso, type Paso, type ResultadoPrueba } from './robotConexion';
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

/** Cabecera de tarjeta: título, subtítulo y una acción opcional a la derecha. */
export function CabeceraTarjeta({ titulo, subtitulo, accion }: {
  titulo: string; subtitulo: React.ReactNode; accion?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#14202B]/[0.06]">
      <div className="min-w-0">
        <PanelTitle>{titulo}</PanelTitle>
        <p className="text-[11px] text-[#8A8C8E] mt-0.5 leading-snug">{subtitulo}</p>
      </div>
      {accion && <div className="flex-none">{accion}</div>}
    </div>
  );
}

/** Fila de tarjeta con el mismo aspecto que un robot de la lista. */
export function FilaTarjeta({ icono, titulo, detalle, derecha, tonoDetalle = 'normal' }: {
  icono: React.ReactNode; titulo: string; detalle?: string; derecha?: React.ReactNode; tonoDetalle?: 'normal' | 'error';
}) {
  return (
    <li className="flex items-start gap-2 rounded-xl px-3.5 py-3 bg-[#F3F6F9]">
      <span className="flex-none mt-px">{icono}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-[#1A1C1E] truncate">{titulo}</span>
          {derecha && <span className="flex-none text-[10px] font-medium text-[#8A8C8E]">{derecha}</span>}
        </div>
        {detalle && (
          <p className={`text-[10px] mt-0.5 leading-snug ${tonoDetalle === 'error' ? 'text-[#991B1B]' : 'text-[#8A8C8E]'}`}>{detalle}</p>
        )}
      </div>
    </li>
  );
}

/** Qué comprueba cada paso (se muestra mientras todavía no hay resultado). */
const QUE_COMPRUEBA: Record<IdPaso, string> = {
  red: 'Que el robot responda en la red.',
  ssh: 'Inicio de sesión en la computadora del robot.',
  dds: 'Que llegue el estado de los motores.',
  camara: 'Que la cámara de la cabeza esté conectada.',
};

export function ListaPasos({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="space-y-2">
      {pasos.map(p => {
        const e = ICONO[p.estado];
        return (
          <FilaTarjeta
            key={p.id}
            icono={<span className={`w-5 h-5 rounded-full flex items-center justify-center ${e.color}`} aria-hidden>{e.icono}</span>}
            titulo={p.nombre}
            detalle={p.mensaje ?? QUE_COMPRUEBA[p.id]}
            tonoDetalle={p.estado === 'error' ? 'error' : 'normal'}
            derecha={p.estado === 'en_curso' && p.limite_s ? `límite ${p.limite_s} s` : p.ms !== undefined ? `${(p.ms / 1000).toFixed(1)} s` : e.texto}
          />
        );
      })}
    </ol>
  );
}

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// ─── Panel "Probar conexión" ──────────────────────────────────────────────────

export function PanelPrueba({ secundario = false, prueba, probando, puedeProbar, motivoNoProbar, onProbar }: {
  /** Botón en estilo secundario (cuando en la pantalla ya hay otro botón principal) */
  secundario?: boolean;
  prueba: ResultadoPrueba | null;
  probando: boolean;
  puedeProbar: boolean;
  motivoNoProbar?: string;
  onProbar: () => void;
}) {
  const pasos = prueba?.pasos.length ? prueba.pasos : PASOS_BASE;
  const subtitulo = !puedeProbar && motivoNoProbar
    ? motivoNoProbar
    : prueba && !probando
      ? <span className={`font-semibold ${prueba.resultado === 'ok' ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>
          {prueba.resultado === 'ok' ? 'Todos los canales respondieron' : 'Hay canales con fallos'}
          <span className="font-normal text-[#8A8C8E]"> · {fechaCorta(prueba.fecha)}</span>
        </span>
      : 'Comprueba cada canal en orden. Nunca envía órdenes de movimiento.';
  return (
    <div className={tarjetaBlanca}>
      <CabeceraTarjeta
        titulo="Prueba de conexión"
        subtitulo={subtitulo}
        accion={
          <button
            type="button"
            onClick={onProbar}
            disabled={!puedeProbar || probando}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              secundario ? 'bg-[#E3EEF8] text-[#377DC0] hover:bg-[#D3E4F4]' : 'bg-[#377DC0] text-white hover:bg-[#2D69A6]'
            }`}
          >
            {probando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
            {probando ? 'Probando…' : prueba ? 'Volver a probar' : 'Probar'}
          </button>
        }
      />
      <div className="p-3">
        <ListaPasos pasos={pasos} />
      </div>
    </div>
  );
}

// ─── Robots guardados ─────────────────────────────────────────────────────────

export function RobotsGuardados({ robots, cargando, error, seleccionado, creando, onSeleccionar, onNuevo }: {
  robots: RobotNube[];
  cargando: boolean;
  error: string | null;
  seleccionado: string | null;
  /** Se está añadiendo un robot nuevo (todavía sin guardar) */
  creando: boolean;
  onSeleccionar: (r: RobotNube) => void;
  onNuevo: () => void;
}) {
  return (
    <div className={tarjetaBlanca}>
      <CabeceraTarjeta
        titulo="Robots guardados"
        subtitulo="Elegí uno para ver su conexión."
        accion={
          <button
            type="button"
            onClick={onNuevo}
            title="Añadir otro robot"
            aria-label="Añadir otro robot"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#377DC0] text-white hover:bg-[#2D69A6] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        }
      />

      <div className="p-3 space-y-2">
        {creando && (
          <div className="rounded-xl px-3.5 py-3 bg-[#377DC0] text-white shadow-[0_2px_12px_rgba(55,125,192,0.30)]">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 flex-none" />
              <span className="text-[12px] font-semibold">Nuevo robot</span>
            </div>
            <p className="text-[10px] text-white/75 mt-0.5">Sin guardar todavía</p>
          </div>
        )}
        {cargando && <p className="text-[12px] text-[#8A8C8E] px-1">Cargando…</p>}
        {error && <p className="text-[12px] text-[#991B1B] px-1">{error}</p>}
        {!cargando && !error && robots.length === 0 && <p className="text-[12px] text-[#8A8C8E] px-1">Todavía no guardaste ningún robot.</p>}

        <ul className="space-y-2">
          {robots.map(r => {
            const activo = !creando && seleccionado === r.id;
            return (
              <li
                key={r.id}
                aria-current={activo ? 'true' : undefined}
                className={`rounded-xl px-3.5 py-3 transition-colors ${
                  activo
                    ? 'bg-[#377DC0] text-white shadow-[0_2px_12px_rgba(55,125,192,0.30)]'
                    : 'bg-[#F3F6F9] hover:bg-[#E9EFF5] text-[#1A1C1E]'
                }`}
              >
                <button type="button" onClick={() => onSeleccionar(r)} className="w-full text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <Bot className={`w-4 h-4 flex-none ${activo ? 'text-white' : 'text-[#377DC0]'}`} />
                    <span className="text-[12px] font-semibold truncate flex-1">{r.label}</span>
                    {r.ultimaPruebaResultado && (
                      <span
                        className={`w-2 h-2 rounded-full flex-none ${activo ? 'ring-2 ring-white/70' : ''}`}
                        style={{ backgroundColor: r.ultimaPruebaResultado === 'ok' ? '#10B981' : '#EF4444' }}
                        title={`Última prueba: ${r.ultimaPruebaResultado === 'ok' ? 'correcta' : 'con fallos'}`}
                      />
                    )}
                  </div>
                  <p className={`text-[10px] mt-0.5 truncate ${activo ? 'text-white/75' : 'text-[#8A8C8E]'}`}>
                    {r.conexion ? `${r.conexion.host} · DDS ${r.conexion.dds_domain_id}` : 'Sin perfil de conexión'}
                    {r.ultimaPruebaFecha ? ` · ${fechaCorta(r.ultimaPruebaFecha)}` : ''}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─── Vista de un robot guardado ───────────────────────────────────────────────

/** Cabecera del robot elegido: nombre, modelo, última prueba y acciones. */
export function CabeceraRobot({ robot, conectando, onConectar, onEditar, onEliminar, children }: {
  robot: RobotNube;
  conectando: boolean;
  onConectar: () => void;
  onEditar: () => void;
  onEliminar: () => void;
  /** Contenido bajo el nombre, en el mismo recuadro (la prueba de conexión) */
  children?: React.ReactNode;
}) {
  const sim = robot.modelo === MODELO_SIMULADOR;
  const estado = sim
    ? { texto: 'Simulador', clase: 'bg-[#E3EEF8] text-[#1E4E7C]', punto: '#377DC0' }
    : !robot.conexion
    ? { texto: 'Sin datos de conexión', clase: 'bg-black/5 text-[#66686A]', punto: '#A0A2A4' }
    : !robot.ultimaPruebaResultado
      ? { texto: 'Sin probar', clase: 'bg-black/5 text-[#66686A]', punto: '#A0A2A4' }
      : robot.ultimaPruebaResultado === 'ok'
        ? { texto: 'Última prueba correcta', clase: 'bg-[#ECFDF5] text-[#065F46]', punto: '#10B981' }
        : { texto: 'Última prueba con fallos', clase: 'bg-[#FEF2F2] text-[#991B1B]', punto: '#EF4444' };
  return (
    <div className={tarjetaBlanca}>
    <div className="px-6 py-5 flex items-center gap-4">
      <span className="flex-none w-12 h-12 rounded-2xl bg-[#E3EEF8] text-[#377DC0] flex items-center justify-center">
        <Bot className="w-6 h-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[18px] font-bold text-[#1A1C1E] truncate">{robot.label}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[12px] text-[#8A8C8E]">{robot.modelo || 'Unitree G1'}</span>
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${estado.clase}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: estado.punto }} />
            {estado.texto}
            {robot.ultimaPruebaFecha && robot.conexion ? ` · ${fechaCorta(robot.ultimaPruebaFecha)}` : ''}
          </span>
        </div>
      </div>
      <div className="flex-none flex items-center gap-3">
        <button type="button" onClick={onEliminar} title={`Eliminar ${robot.label}`} aria-label={`Eliminar ${robot.label}`}
          className="flex items-center justify-center w-10 h-10 rounded-xl text-[#991B1B] hover:bg-[#FEF2F2] transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={onEditar}
          className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6]">
          <Pencil className="w-3.5 h-3.5" />
          {robot.conexion || sim ? 'Editar' : 'Configurar'}
        </button>
        {robot.conexion && (
          <PrimaryButton onClick={onConectar} disabled={conectando} shadow
            icon={conectando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}>
            Conectar
          </PrimaryButton>
        )}
      </div>
    </div>
    {children}
    </div>
  );
}

/** Prueba de conexión dentro del recuadro del robot: los 4 pasos en una fila. */
export function PruebaEnRecuadro({ prueba, probando, puedeProbar, motivoNoProbar, onProbar }: {
  prueba: ResultadoPrueba | null;
  probando: boolean;
  puedeProbar: boolean;
  motivoNoProbar?: string;
  onProbar: () => void;
}) {
  const pasos = prueba?.pasos.length ? prueba.pasos : PASOS_BASE;
  return (
    <div className="px-6 pt-4 pb-5 border-t border-[#14202B]/[0.06]">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-[#1A1C1E]">Prueba de conexión</h3>
          <p className="text-[11px] text-[#8A8C8E] mt-0.5">
            {!puedeProbar && motivoNoProbar
              ? motivoNoProbar
              : prueba && !probando
                ? <span className={`font-semibold ${prueba.resultado === 'ok' ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>
                    {prueba.resultado === 'ok' ? 'Todos los canales respondieron' : 'Hay canales con fallos'}
                    <span className="font-normal text-[#8A8C8E]"> · {fechaCorta(prueba.fecha)}</span>
                  </span>
                : 'Comprueba cada canal en orden. Nunca envía órdenes de movimiento.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onProbar}
          disabled={!puedeProbar || probando}
          className="flex-none flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold bg-[#E3EEF8] text-[#377DC0] hover:bg-[#D3E4F4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {probando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
          {probando ? 'Probando…' : prueba ? 'Volver a probar' : 'Probar'}
        </button>
      </div>
      <ol className="grid grid-cols-4 gap-3">
        {pasos.map(p => {
          const e = ICONO[p.estado];
          return (
            <li key={p.id} className="rounded-xl bg-[#F3F6F9] px-3.5 py-3 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`flex-none w-5 h-5 rounded-full flex items-center justify-center ${e.color}`} aria-hidden>{e.icono}</span>
                <span className="text-[12px] font-semibold text-[#1A1C1E] flex-1 truncate">{p.nombre}</span>
                <span className="flex-none text-[10px] font-medium text-[#8A8C8E]">
                  {p.estado === 'en_curso' && p.limite_s ? `límite ${p.limite_s} s` : p.ms !== undefined ? `${(p.ms / 1000).toFixed(1)} s` : e.texto}
                </span>
              </div>
              <p className={`text-[10px] leading-snug mt-1.5 ${p.estado === 'error' ? 'text-[#991B1B]' : 'text-[#8A8C8E]'}`}>
                {p.mensaje ?? QUE_COMPRUEBA[p.id]}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Datos de conexión guardados: ficha sin iconos, etiqueta arriba y valor debajo. */
export function DatosConexion({ robot }: { robot: RobotNube }) {
  const c = robot.conexion;
  const filas: [string, string][] = c
    ? [
        ['IP del robot', c.host],
        ['Usuario SSH', c.ssh_usuario],
        ['Puerto SSH', String(c.ssh_puerto)],
        ['Domain ID (DDS)', String(c.dds_domain_id)],
        ['Tarjeta de red', c.interfaz ?? 'Automática'],
      ]
    : [];
  return (
    <div className={tarjetaBlanca}>
      <CabeceraTarjeta titulo="Datos de conexión" subtitulo="Guardados en la nube. La contraseña nunca se muestra." />
      {robot.modelo === MODELO_SIMULADOR ? (
        <p className="px-6 pb-5 text-[13px] text-[#66686A]">Es un simulador: no tiene datos de conexión. Las fotos y la posición las manda el script de MuJoCo al backend de esta PC.</p>
      ) : c ? (
        <dl className="grid grid-cols-5 divide-x divide-[#14202B]/[0.06]">
          {filas.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="px-5 py-4 min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8C8E]">{etiqueta}</dt>
              <dd className="text-[14px] font-semibold text-[#1A1C1E] mt-1 truncate tabular-nums" title={valor}>{valor}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="px-5 py-4 text-[12px] text-[#66686A]">Este robot todavía no tiene datos de conexión. Pulsá «Configurar».</p>
      )}
    </div>
  );
}

/** Lo que se ve a la derecha cuando todavía no hay robots guardados. */
export function SinRobots({ cargando, onNuevo }: { cargando: boolean; onNuevo: () => void }) {
  return (
    <div className={tarjetaBlanca}>
      <div className="px-6 py-10 flex flex-col items-center text-center">
        <span className="w-12 h-12 rounded-2xl bg-[#E3EEF8] text-[#377DC0] flex items-center justify-center mb-3">
          <Bot className="w-6 h-6" />
        </span>
        <PanelTitle>{cargando ? 'Cargando robots…' : 'Todavía no tenés robots'}</PanelTitle>
        {!cargando && (
          <>
            <p className="text-[12px] text-[#8A8C8E] mt-1 mb-4">Añadí tu primer Unitree G1 para probar su conexión.</p>
            <PrimaryButton onClick={onNuevo} shadow icon={<Plus className="w-4 h-4" />}>Añadir robot</PrimaryButton>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Eliminar robot ───────────────────────────────────────────────────────────

export function DialogoEliminar({ robot, enviando, error, onConfirmar, onCerrar }: {
  robot: RobotNube;
  enviando: boolean;
  error: string | null;
  onConfirmar: () => void;
  onCerrar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={`Eliminar ${robot.label}`}>
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.16)] overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <span className="flex-none w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#991B1B] flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <PanelTitle>¿Eliminar {robot.label}?</PanelTitle>
            <p className="text-[12px] text-[#66686A] mt-1 leading-snug">
              Se borran su perfil de conexión y su contraseña guardada. No se puede deshacer.
            </p>
            {error && <p className="text-[12px] font-medium text-[#991B1B] mt-3 leading-snug">{error}</p>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 px-6 py-4 bg-[#F8FAFC] border-t border-[#14202B]/[0.06]">
          <button type="button" onClick={onCerrar} disabled={enviando} className="text-[13px] font-medium text-[#8A8C8E] hover:text-[#1A1C1E]">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} disabled={enviando}
            className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-[#DC2626] text-white hover:bg-[#B91C1C] disabled:opacity-50">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {enviando ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
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
