import { BACKEND_URL } from './sesion';
import { name as nombreApp, version as versionApp } from '../package.json';

// ─── Perfil de conexión de un Unitree G1 ─────────────────────────────────────

export type ModoConexion = 'lan' | 'wifi';

export interface RobotForm {
  codigo: string;
  modelo: 'Unitree G1';
  modo: ModoConexion;
  host: string;
  interfaz: string;
  sshUsuario: string;
  sshPassword: string;
  sshPuerto: string;
  webUrl: string;
  /** false mientras la URL se arma sola a partir del host */
  webUrlEditada: boolean;
  webUsuario: string;
  webPassword: string;
  ddsDomainId: string;
  /** vacío = la app no usa ROS2 por separado (se usa el Domain ID del SDK) */
  rosDomainId: string;
  namespace: string;
}

/** Lo que se guarda en la nube, sin contraseñas (van aparte y cifradas). */
export interface ConexionGuardada {
  modo: ModoConexion;
  host: string;
  interfaz: string | null;
  ssh_usuario: string;
  ssh_puerto: number;
  web_url: string;
  web_usuario: string;
  dds_domain_id: number;
  ros_domain_id: number | null;
  namespace: string;
}

export const IP_LAN_POR_DEFECTO = '192.168.123.164';
export const CREDENCIALES_POR_DEFECTO = { ssh: { usuario: 'unitree', clave: '123' }, web: { usuario: 'x', clave: 'mybotshop' } };
export const DDS_DOMAIN_MAX = 232;
export const ROS_DOMAIN_MAX = 101;

export const urlWebserver = (host: string) => (host.trim() ? `http://${host.trim()}:9000/` : '');

export function formularioVacio(): RobotForm {
  return {
    codigo: '',
    modelo: 'Unitree G1',
    modo: 'lan',
    host: IP_LAN_POR_DEFECTO,
    interfaz: '',
    sshUsuario: CREDENCIALES_POR_DEFECTO.ssh.usuario,
    sshPassword: CREDENCIALES_POR_DEFECTO.ssh.clave,
    sshPuerto: '22',
    webUrl: urlWebserver(IP_LAN_POR_DEFECTO),
    webUrlEditada: false,
    webUsuario: CREDENCIALES_POR_DEFECTO.web.usuario,
    webPassword: CREDENCIALES_POR_DEFECTO.web.clave,
    ddsDomainId: '0',
    rosDomainId: '',
    namespace: '',
  };
}

/** Formulario para editar un perfil guardado: las contraseñas quedan vacías (= no cambiarlas). */
export function formularioDesdePerfil(codigo: string, c: ConexionGuardada): RobotForm {
  return {
    codigo,
    modelo: 'Unitree G1',
    modo: c.modo,
    host: c.host,
    interfaz: c.interfaz ?? '',
    sshUsuario: c.ssh_usuario,
    sshPassword: '',
    sshPuerto: String(c.ssh_puerto),
    webUrl: c.web_url,
    webUrlEditada: c.web_url !== urlWebserver(c.host),
    webUsuario: c.web_usuario,
    webPassword: '',
    ddsDomainId: String(c.dds_domain_id),
    rosDomainId: c.ros_domain_id === null ? '' : String(c.ros_domain_id),
    namespace: c.namespace,
  };
}

/** Cambiar el host o el modo actualiza la URL del webserver salvo que se haya editado a mano. */
export function aplicarCambio(f: RobotForm, cambio: Partial<RobotForm>): RobotForm {
  const sig = { ...f, ...cambio };
  if (cambio.modo && cambio.modo !== f.modo) {
    // En LAN la IP es fija; en WiFi la asigna el router, así que no se sugiere ninguna
    if (cambio.modo === 'lan' && !f.host.trim()) sig.host = IP_LAN_POR_DEFECTO;
    if (cambio.modo === 'wifi' && f.host.trim() === IP_LAN_POR_DEFECTO) sig.host = '';
  }
  if (cambio.webUrl !== undefined) sig.webUrlEditada = cambio.webUrl !== urlWebserver(sig.host);
  if (!sig.webUrlEditada) sig.webUrl = urlWebserver(sig.host);
  return sig;
}

// ─── Validaciones ─────────────────────────────────────────────────────────────

export type CampoForm = keyof RobotForm;
export type Errores = Partial<Record<CampoForm, string>>;

const RE_IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const RE_HOST = /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const RE_NAMESPACE = /^[a-z0-9_]+$/;

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

/** Errores que impiden guardar o probar. `otros` = robots del usuario (sin el que se edita). */
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

  const conConexion = otros.filter(r => r.conexion);
  const dds = entero(f.ddsDomainId);
  if (dds === null || dds > DDS_DOMAIN_MAX) e.ddsDomainId = `Debe ser un número entero entre 0 y ${DDS_DOMAIN_MAX}.`;
  else if (conConexion.some(r => r.conexion!.dds_domain_id === dds)) {
    e.ddsDomainId = `Otro de tus robots ya usa el Domain ID ${dds}.`;
  }

  if (f.rosDomainId.trim()) {
    const ros = entero(f.rosDomainId);
    if (ros === null || ros > ROS_DOMAIN_MAX) e.rosDomainId = `Debe ser un número entero entre 0 y ${ROS_DOMAIN_MAX}, o quedar vacío.`;
    else if (conConexion.some(r => r.conexion!.ros_domain_id === ros)) {
      e.rosDomainId = `Otro de tus robots ya usa el ROS_DOMAIN_ID ${ros}.`;
    }
  }

  const ns = f.namespace.trim();
  if (!ns) e.namespace = 'Falta el ID / namespace del robot.';
  else if (ns.startsWith('/')) e.namespace = 'Sin barra inicial: escribí g1_unit_001, no /g1_unit_001.';
  else if (!RE_NAMESPACE.test(ns)) e.namespace = 'Solo minúsculas, números y guion bajo, sin espacios.';
  else if (/^\d/.test(ns)) e.namespace = 'ROS2 no admite que empiece con un número.';
  else if (conConexion.some(r => r.conexion!.namespace === ns)) e.namespace = 'Otro de tus robots ya usa ese namespace.';

  return e;
}

/** Los campos que hacen falta para probar la conexión (el nombre no). */
export const CAMPOS_CONEXION: CampoForm[] = ['host', 'sshUsuario', 'sshPuerto', 'ddsDomainId', 'rosDomainId', 'namespace'];

export function avisos(f: RobotForm): string[] {
  const a: string[] = [];
  const sshDefecto = f.sshUsuario === CREDENCIALES_POR_DEFECTO.ssh.usuario && f.sshPassword === CREDENCIALES_POR_DEFECTO.ssh.clave;
  if (sshDefecto || f.webPassword === CREDENCIALES_POR_DEFECTO.web.clave) {
    a.push('Estás usando credenciales por defecto (unitree / 123). Cambialas fuera de un entorno de pruebas.');
  }
  if (f.modo === 'wifi') a.push('En WiFi, verificá que el hub o adaptador WiFi esté conectado físicamente al robot.');
  return a;
}

// ─── Conversión para el backend y la nube ─────────────────────────────────────

export function aConexionGuardada(f: RobotForm): ConexionGuardada {
  return {
    modo: f.modo,
    host: f.host.trim(),
    interfaz: f.interfaz || null,
    ssh_usuario: f.sshUsuario.trim(),
    ssh_puerto: Number(f.sshPuerto),
    web_url: f.webUrl.trim(),
    web_usuario: f.webUsuario.trim(),
    dds_domain_id: Number(f.ddsDomainId),
    ros_domain_id: f.rosDomainId.trim() ? Number(f.rosDomainId) : null,
    namespace: f.namespace.trim(),
  };
}

function cuerpoPrueba(f: RobotForm, robotId?: string) {
  return {
    ...aConexionGuardada(f),
    ssh_password: f.sshPassword,
    web_password: f.webPassword,
    robot_id: robotId ? Number(robotId) : null,
  };
}

const MASCARA = '••••••';

/** Lo que muestra "Ver JSON de configuración": nunca las contraseñas. */
export function jsonEnmascarado(f: RobotForm, editando: boolean) {
  const clave = (v: string) => (v ? MASCARA : editando ? `${MASCARA} (guardada)` : '');
  return {
    nombre: f.codigo.trim(),
    modelo: f.modelo,
    ...aConexionGuardada(f),
    ssh_password: clave(f.sshPassword),
    web_password: clave(f.webPassword),
  };
}

// ─── Prueba de conexión ───────────────────────────────────────────────────────

export type IdPaso = 'red' | 'ssh' | 'webserver' | 'dds' | 'ros2' | 'camara';
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

// ─── Interfaces, drivers y seguridad ─────────────────────────────────────────

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

export type EstadoDrivers = 'activos' | 'apagados' | 'desconocido';

export async function consultarDrivers(f: RobotForm, robotId?: string): Promise<{ estado: EstadoDrivers; mensaje: string }> {
  const res = await fetch(`${BACKEND_URL}/robot/drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpoPrueba(f, robotId)),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** El estado de los drivers que se deduce de una prueba ya hecha. */
export function driversSegunPrueba(r: ResultadoPrueba): EstadoDrivers {
  const red = r.pasos.find(p => p.id === 'red');
  const ros2 = r.pasos.find(p => p.id === 'ros2');
  if (!red || red.estado !== 'ok' || !ros2) return 'desconocido';
  if (ros2.estado === 'ok') return 'activos';
  return ros2.estado === 'error' ? 'apagados' : 'desconocido';
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
