import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { BACKEND_URL } from './sesion';

export type Modalidad = 'semanal' | 'mensual';

export interface Alquiler {
  id: number;
  modalidad: Modalidad;
  cantidad: number;
  fecha_inicio: string;
  fecha_fin: string;
  monto_usd: number;
  tipo_cambio: number;
  monto_ars: number;
  estado: 'pendiente' | 'pagado' | 'devuelto';
  creado: string;
  pagado_en: string | null;
  /** Solo al crear: la página de Mercado Pago donde se paga */
  url_pago?: string | null;
}

export interface Licencia {
  /** Si es true, sin alquiler pagado no se pueden iniciar inspecciones */
  obligatoria: boolean;
  activa: boolean;
  desde: string | null;
  hasta: string | null;
}

export interface Precios {
  semanal_usd: number;
  mensual_usd: number;
  tipo_cambio_ars: number;
  /** true mientras Mercado Pago esté en modo de prueba: no se cobra dinero real */
  modo_prueba: boolean;
  robots: number;
}

const API = `${BACKEND_URL}/nube/api`;

class ErrorNube extends Error {
  constructor(public estado: number, public detalle: string) {
    super(detalle);
  }
}

async function pedir<T>(ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  const res = await fetch(`${API}/${ruta}`, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (!res.ok) {
    let detalle = '';
    try { detalle = (await res.json()).detail ?? ''; } catch { /* sin cuerpo */ }
    throw new ErrorNube(res.status, detalle);
  }
  return res.json();
}

export const obtenerPrecios = () => pedir<Precios>('alquileres/precios');
export const listarAlquileres = () => pedir<Alquiler[]>('alquileres');

/** Días en que no queda ningún robot libre. Sin datos de quién lo alquiló. */
export interface Tramo { desde: string; hasta: string }
export const obtenerOcupacion = () => pedir<Tramo[]>('alquileres/ocupacion');
export const pisaOcupado = (inicio: string, fin: string, ocupado: Tramo[]) =>
  ocupado.some(t => inicio <= t.hasta && fin >= t.desde);
export const crearAlquiler = (modalidad: Modalidad, cantidad: number, fechaInicio: string) =>
  pedir<Alquiler>('alquileres', 'POST', { modalidad, cantidad, fecha_inicio: fechaInicio });
/** Le pide al servidor que le pregunte a Mercado Pago si ya se pagó (el servidor decide, no la pantalla) */
export const verificarAlquiler = (id: number) => pedir<Alquiler>(`alquileres/${id}/verificar`, 'POST');

/** Mensaje para mostrar cuando algo sale mal */
export function textoError(e: unknown): string {
  if (e instanceof ErrorNube) {
    if (e.estado === 409) return 'No hay robot disponible en esas fechas. Probá con otras.';
    if (e.estado === 404) return 'El servicio de alquiler todavía no está disponible.';
    if (e.estado === 503) return 'El servicio de pago todavía no está configurado.';
    if (e.estado === 502) return 'Mercado Pago no respondió. Probá de nuevo en unos minutos.';
    if (e.estado === 400) return 'La fecha de inicio no es válida.';
    if (e.estado === 401) return 'Tu sesión venció. Volvé a iniciar sesión.';
  }
  return 'No se pudo conectar con el servicio. Revisá tu conexión.';
}

// Última licencia conocida, para que la barra lateral sepa si mostrar la guía sin volver a consultar la nube
let licenciaActual: Licencia | null = null;
const oyentes = new Set<() => void>();
function publicar(l: Licencia | null) { licenciaActual = l; oyentes.forEach(f => f()); }
export function useLicenciaActual() {
  return useSyncExternalStore(f => { oyentes.add(f); return () => { oyentes.delete(f); }; }, () => licenciaActual);
}

/** Estado de la licencia Pro. Si la nube no tiene el servicio todavía, no bloquea nada (null). */
export function useLicencia() {
  const [licencia, setLicencia] = useState<Licencia | null>(null);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let vivo = true;
    pedir<Licencia>('licencia')
      .then(l => { if (vivo) { setLicencia(l); publicar(l); } })
      .catch(() => { if (vivo) { setLicencia(null); publicar(null); } });
    return () => { vivo = false; };
  }, [version]);
  return { licencia, recargar };
}

/** Abre la página de pago en el navegador del sistema (la app no abre ventanas propias). */
export function abrirPago(url: string) {
  const motor = (window as unknown as { g1motor?: { abrirPago?: (u: string) => Promise<boolean> } }).g1motor;
  if (motor?.abrirPago) void motor.abrirPago(url);
  else window.open(url, '_blank', 'noopener');
}

// ─── Cálculos para mostrar (el servidor vuelve a calcular todo y es quien manda) ───

export const precioUsd = (m: Modalidad, cantidad: number, p: Precios) =>
  (m === 'semanal' ? p.semanal_usd : p.mensual_usd) * cantidad;

function sumarMeses(d: Date, meses: number): Date {
  const total = d.getMonth() + meses;
  const anio = d.getFullYear() + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const ultimo = new Date(anio, mes + 1, 0).getDate();
  return new Date(anio, mes, Math.min(d.getDate(), ultimo));
}

export function fechaFin(m: Modalidad, inicio: string, cantidad: number): string {
  const [y, mo, d] = inicio.split('-').map(Number);
  if (m === 'semanal') return aIso(new Date(y, mo - 1, d + 7 * cantidad - 1));
  const siguiente = sumarMeses(new Date(y, mo - 1, d), cantidad);
  return aIso(new Date(siguiente.getFullYear(), siguiente.getMonth(), siguiente.getDate() - 1));
}

export function aIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "2026-11-16" → "16/11/2026" */
export const fechaCorta = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

export const dolares = (n: number) => `US$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
export const pesos = (n: number) => `$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
