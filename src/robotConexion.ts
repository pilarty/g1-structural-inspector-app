import { BACKEND_URL } from './sesion';
import { name as nombreApp, version as versionApp } from '../package.json';

// ─── Perfil de conexión de un Unitree G1 ─────────────────────────────────────
// Un G1 de fábrica ofrece dos canales: SSH a su computadora de desarrollo
// (192.168.123.164) y DDS del SDK de Unitree (rt/lowstate, Domain ID 0).
// Solo funciona por cable: el estado del robot (DDS) no sale por WiFi.

export interface RobotForm {
  codigo: string;
  modelo: 'Unitree G1';
  host: string;
  interfaz: string;
  sshUsuario: string;
  sshPassword: string;
  sshPuerto: string;
  ddsDomainId: string;
}

/** Lo que se guarda en la nube, sin contraseñas (van aparte y cifradas). */
export interface ConexionGuardada {
  host: string;
  interfaz: string | null;
  ssh_usuario: string;
  ssh_puerto: number;
  dds_domain_id: number;
}

export const IP_ROBOT_POR_DEFECTO = '192.168.123.164';
export const CREDENCIALES_POR_DEFECTO = { usuario: 'unitree', clave: '123' };
export const DDS_DOMAIN_ROBOT = 0;
export const DDS_DOMAIN_MAX = 232;

export function formularioVacio(): RobotForm {
  return {
    codigo: '',
    modelo: 'Unitree G1',
    host: IP_ROBOT_POR_DEFECTO,
    interfaz: '',
    sshUsuario: CREDENCIALES_POR_DEFECTO.usuario,
    sshPassword: CREDENCIALES_POR_DEFECTO.clave,
    sshPuerto: '22',
    ddsDomainId: String(DDS_DOMAIN_ROBOT),
  };
}

/** Formulario para editar un perfil guardado: la contraseña queda vacía (= no cambiarla). */
export function formularioDesdePerfil(codigo: string, c: ConexionGuardada): RobotForm {
  return {
    codigo,
    modelo: 'Unitree G1',
    host: c.host,
    interfaz: c.interfaz ?? '',
    sshUsuario: c.ssh_usuario,
    sshPassword: '',
    sshPuerto: String(c.ssh_puerto),
    ddsDomainId: String(c.dds_domain_id),
  };
}

// ─── Validaciones ─────────────────────────────────────────────────────────────

export type CampoForm = keyof RobotForm;
export type Errores = Partial<Record<CampoForm, string>>;

const RE_IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const RE_HOST = /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function entero(texto: string): number | null {
  return /^\d+$/.test(texto.trim()) ? Number(texto.trim()) : null;
}

function errorHost(host: string): string | undefined {
  const h = host.trim();
  if (!h) return 'Falta la IP o el host del robot.';
  // Si son solo números y puntos tiene que ser una IPv4 válida; si no, un nombre de host
  if (/^[\d.]+$/.test(h)) return RE_IPV4.test(h) ? undefined : 'La IP no tiene un formato válido (ej. 192.168.123.164).';
  return RE_HOST.test(h) ? undefined : 'El host no tiene un formato válido.';
}

export interface RobotExistente {
  id: string;
  label: string;
  conexion: ConexionGuardada | null;
}

/**
 * Errores que impiden guardar o probar. `otros` = robots del usuario (sin el que se edita).
 * Solo el nombre tiene que ser único: todos los G1 usan la misma IP y el mismo Domain ID.
 */
export function validar(f: RobotForm, otros: RobotExistente[]): Errores {
  const e: Errores = {};

  if (!f.codigo.trim()) e.codigo = 'Falta el nombre o ID del robot.';
  else if (otros.some(r => r.label.trim().toLowerCase() === f.codigo.trim().toLowerCase())) {
    e.codigo = 'Ya tenés un robot con ese nombre.';
  }

  const host = errorHost(f.host);
  if (host) e.host = host;

  if (!f.sshUsuario.trim()) e.sshUsuario = 'Falta el usuario SSH.';
  const puerto = entero(f.sshPuerto);
  if (puerto === null || puerto < 1 || puerto > 65535) e.sshPuerto = 'El puerto debe ser un número entre 1 y 65535.';

  const dds = entero(f.ddsDomainId);
  if (dds === null || dds > DDS_DOMAIN_MAX) e.ddsDomainId = `Debe ser un número entero entre 0 y ${DDS_DOMAIN_MAX}.`;

  return e;
}

/** Los campos que hacen falta para probar la conexión (el nombre no). */
export const CAMPOS_CONEXION: CampoForm[] = ['host', 'sshUsuario', 'sshPuerto', 'ddsDomainId'];

export function avisos(f: RobotForm): string[] {
  const a: string[] = [];
  if (f.sshUsuario === CREDENCIALES_POR_DEFECTO.usuario && f.sshPassword === CREDENCIALES_POR_DEFECTO.clave) {
    a.push('Estás usando credenciales por defecto (unitree / 123). Cambialas fuera de un entorno de pruebas.');
  }
  if (entero(f.ddsDomainId) !== null && entero(f.ddsDomainId) !== DDS_DOMAIN_ROBOT) {
    a.push(`Un G1 real usa el Domain ID ${DDS_DOMAIN_ROBOT}. Otro valor solo sirve para el robot simulado.`);
  }
  return a;
}

// ─── Conversión para el backend y la nube ─────────────────────────────────────

export function aConexionGuardada(f: RobotForm): ConexionGuardada {
  return {
    host: f.host.trim(),
    interfaz: f.interfaz || null,
    ssh_usuario: f.sshUsuario.trim(),
    ssh_puerto: Number(f.sshPuerto),
    dds_domain_id: Number(f.ddsDomainId),
  };
}

function cuerpoPrueba(f: RobotForm, robotId?: string) {
  return {
    ...aConexionGuardada(f),
    ssh_password: f.sshPassword,
    robot_id: robotId ? Number(robotId) : null,
  };
}

const MASCARA = '••••••';

/** Lo que muestra "Ver JSON de configuración": nunca la contraseña. */
export function jsonEnmascarado(f: RobotForm, editando: boolean) {
  return {
    nombre: f.codigo.trim(),
    modelo: f.modelo,
    ...aConexionGuardada(f),
    ssh_password: f.sshPassword ? MASCARA : editando ? `${MASCARA} (guardada)` : '',
  };
}

// ─── Prueba de conexión ───────────────────────────────────────────────────────

export type IdPaso = 'red' | 'ssh' | 'dds' | 'camara';
export type EstadoPaso = 'espera' | 'en_curso' | 'ok' | 'error' | 'omitido' | 'pendiente';

export interface Paso {
  id: IdPaso;
  nombre: string;
  limite_s: number;
  estado: EstadoPaso;
  mensaje?: string;
  ms?: number;
}

export interface InterfazUsada {
  nombre: string;
  ip: string;
}

export interface ResultadoPrueba {
  fecha: string;
  resultado: 'ok' | 'error';
  tipo: 'completa' | 'rapida';
  interfaz: InterfazUsada | null;
  pasos: Paso[];
}

type Evento =
  | { tipo: 'inicio'; fecha: string; interfaz: InterfazUsada | null; pasos: { id: IdPaso; nombre: string; limite_s: number }[] }
  | { tipo: 'paso'; paso: IdPaso; estado: EstadoPaso; mensaje?: string; ms?: number }
  | { tipo: 'fin'; fecha: string; resultado: 'ok' | 'error'; fallos: IdPaso[] };

async function leerEventos(res: Response, alEvento: (e: Evento) => void) {
  if (!res.ok || !res.body) throw new Error(String(res.status));
  const lector = res.body.getReader();
  const deco = new TextDecoder();
  let resto = '';
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    resto += deco.decode(value, { stream: true });
    const lineas = resto.split('\n');
    resto = lineas.pop() ?? '';
    for (const l of lineas) if (l.trim()) alEvento(JSON.parse(l));
  }
}

/** Ejecuta la prueba y va llamando a `alCambiar` con el estado de los pasos. */
async function correrPrueba(
  url: string,
  init: RequestInit,
  tipo: ResultadoPrueba['tipo'],
  alCambiar: (r: ResultadoPrueba) => void,
): Promise<ResultadoPrueba> {
  let r: ResultadoPrueba = { fecha: new Date().toISOString(), resultado: 'error', tipo, interfaz: null, pasos: [] };
  const res = await fetch(url, init);
  await leerEventos(res, e => {
    if (e.tipo === 'inicio') {
      r = { ...r, fecha: e.fecha, interfaz: e.interfaz, pasos: e.pasos.map(p => ({ ...p, estado: 'espera' })) };
    } else if (e.tipo === 'paso') {
      r = { ...r, pasos: r.pasos.map(p => (p.id === e.paso ? { ...p, estado: e.estado, mensaje: e.mensaje, ms: e.ms } : p)) };
    } else {
      r = { ...r, fecha: e.fecha, resultado: e.resultado };
    }
    alCambiar(r);
  });
  return r;
}

export function probarConexion(f: RobotForm, robotId: string | undefined, alCambiar: (r: ResultadoPrueba) => void, signal?: AbortSignal) {
  return correrPrueba(`${BACKEND_URL}/robot/prueba`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpoPrueba(f, robotId)),
    signal,
  }, 'completa', alCambiar);
}

export function reconectar(robotId: string, alCambiar: (r: ResultadoPrueba) => void, signal?: AbortSignal) {
  return correrPrueba(`${BACKEND_URL}/robot/reconectar/${robotId}`, { method: 'POST', signal }, 'rapida', alCambiar);
}

// ─── Interfaces, estado y seguridad ──────────────────────────────────────────

export interface InterfazRed {
  nombre: string;
  ips: string[];
  activa: boolean;
}

export async function detectarInterfaces(host: string): Promise<{ interfaces: InterfazRed[]; sugerida: string | null }> {
  const res = await fetch(`${BACKEND_URL}/robot/interfaces?host=${encodeURIComponent(host.trim())}`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export type EstadoRobot = 'recibiendo' | 'sin_datos' | 'desconocido';

/** Si el robot está enviando su estado por DDS. Solo escucha: no le envía nada. */
export async function consultarEstado(f: RobotForm, robotId?: string): Promise<{ estado: EstadoRobot; mensaje: string }> {
  const res = await fetch(`${BACKEND_URL}/robot/estado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpoPrueba(f, robotId)),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** El estado del robot que se deduce de una prueba ya hecha. */
export function estadoSegunPrueba(r: ResultadoPrueba): EstadoRobot {
  const red = r.pasos.find(p => p.id === 'red');
  const dds = r.pasos.find(p => p.id === 'dds');
  if (!red || red.estado !== 'ok' || !dds) return 'desconocido';
  if (dds.estado === 'ok') return 'recibiendo';
  return dds.estado === 'error' ? 'sin_datos' : 'desconocido';
}

export async function autorizarMovimiento(confirmaciones: {
  espacio_despejado: boolean;
  soporte_seguridad: boolean;
  operador_con_control: boolean;
}) {
  const res = await fetch(`${BACKEND_URL}/robot/movimiento/autorizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(confirmaciones),
  });
  if (!res.ok) throw new Error(String(res.status));
}

// ─── Registro de diagnóstico ─────────────────────────────────────────────────

export async function exportarDiagnostico(f: RobotForm, prueba: ResultadoPrueba, editando: boolean) {
  const [versiones, interfaces] = await Promise.all([
    fetch(`${BACKEND_URL}/robot/version`).then(r => r.json()).catch(() => null),
    detectarInterfaces(f.host).catch(() => null),
  ]);
  const registro = {
    generado: new Date().toISOString(),
    aplicacion: { nombre: nombreApp, version: versionApp, navegador: navigator.userAgent },
    versiones,
    interfaz_usada: prueba.interfaz,
    interfaces_detectadas: interfaces?.interfaces ?? null,
    configuracion: jsonEnmascarado(f, editando),
    prueba: {
      fecha: prueba.fecha,
      tipo: prueba.tipo,
      resultado: prueba.resultado,
      pasos: prueba.pasos.map(({ id, nombre, estado, mensaje, ms, limite_s }) => ({ id, nombre, estado, mensaje, ms, limite_s })),
    },
    errores: prueba.pasos.filter(p => p.estado === 'error').map(p => ({ paso: p.nombre, mensaje: p.mensaje })),
  };
  const nombre = `diagnostico-g1-${(f.codigo.trim() || 'robot').replace(/[^\w-]+/g, '_')}-${prueba.fecha.slice(0, 19).replace(/[:T]/g, '-')}.json`;
  const url = URL.createObjectURL(new Blob([JSON.stringify(registro, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
