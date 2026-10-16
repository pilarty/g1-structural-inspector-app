// Compartir una edificación entera como archivo (.g1insp), con todas sus inspecciones:
// exportarla a un archivo e importar uno que te pasaron (se crea una copia en tu cuenta).
// El backend local arma y lee el archivo.
import { BACKEND_URL } from './sesion';

interface Puente {
  guardarArchivo?: (nombre: string, contenido: string) => Promise<string | null>;
  abrirArchivo?: () => Promise<{ nombre: string; contenido: string } | null>;
}
const puente = () => (window as unknown as { g1motor?: Puente }).g1motor;

/** Lo que se muestra antes de importar */
export interface ResumenArchivo {
  edificacion: string;
  direccion: string | null;
  proyecto: string | null;
  inspecciones: number;
  /** Fecha de la primera y de la última inspección */
  desde: string | null;
  hasta: string | null;
  plantas: string[];
  hallazgos: number;
  exportadoPor: string | null;
}

/** Arma el archivo de la edificación (con todas sus inspecciones) y lo guarda. */
export async function exportarEdificacion(eid: string, nombre: string): Promise<'ok' | 'cancelado' | 'error'> {
  let contenido: string;
  try {
    const r = await fetch(`${BACKEND_URL}/archivo-inspeccion/edificacion/${eid}`);
    if (!r.ok) return 'error';
    contenido = await r.text();
  } catch {
    return 'error';
  }
  const limpio = nombre.replace(/[\\/:*?"<>|]/g, '-');
  const p = puente();
  if (p?.guardarArchivo) return (await p.guardarArchivo(limpio, contenido)) ? 'ok' : 'cancelado';
  // En el navegador: descarga común
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }));
  a.download = `${limpio}.g1insp`;
  a.click();
  URL.revokeObjectURL(a.href);
  return 'ok';
}

/** Pide elegir un archivo .g1insp y devuelve su contenido (o null si se canceló). */
export async function elegirArchivo(): Promise<{ nombre: string; contenido: string } | null> {
  const p = puente();
  if (p?.abrirArchivo) return p.abrirArchivo();
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.g1insp,application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? { nombre: f.name, contenido: await f.text() } : null);
    };
    input.click();
  });
}

/** Lee el archivo y devuelve el resumen, o un mensaje si no es un archivo válido. */
export function leerResumen(contenido: string): { datos: unknown; resumen: ResumenArchivo } | { error: string } {
  let d: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    d = JSON.parse(contenido);
  } catch {
    return { error: 'El archivo no se puede leer: no es de G1 Structural Inspector.' };
  }
  if (d?.formato !== 'g1-inspeccion') return { error: 'Este archivo no es de G1 Structural Inspector.' };
  // Versión 2: lista de inspecciones · versión 1: una sola inspección con sus partes sueltas
  const insp: Record<string, any>[] = Array.isArray(d.inspecciones) // eslint-disable-line @typescript-eslint/no-explicit-any
    ? d.inspecciones
    : d.inspeccion ? [{ ...d.inspeccion, hallazgos: d.hallazgos }] : [];
  const fechas = insp.map(i => i.fecha_inicio).filter(Boolean).sort();
  return {
    datos: d,
    resumen: {
      edificacion: d.edificacion?.nombre ?? 'Sin nombre',
      direccion: d.edificacion?.direccion ?? null,
      proyecto: d.proyecto?.nombre ?? null,
      inspecciones: insp.length,
      desde: fechas[0] ?? null,
      hasta: fechas[fechas.length - 1] ?? null,
      plantas: [...new Set(insp.map(i => i.planta).filter(Boolean))] as string[],
      hallazgos: insp.reduce((n, i) => n + (Array.isArray(i.hallazgos) ? i.hallazgos.length : 0), 0),
      exportadoPor: d.exportado_por ?? null,
    },
  };
}

/** Crea la copia en la cuenta: en la edificación elegida o, si no hay, en una nueva dentro del proyecto. */
export async function importarArchivo(datos: unknown, proyectoId: string, edificacionId?: string | null):
  Promise<{ ok: true; edificacionId: string; avisos: string[] } | { ok: false; mensaje: string }> {
  try {
    const q = new URLSearchParams({ proyecto_id: proyectoId });
    if (edificacionId) q.set('edificacion_id', edificacionId);
    const r = await fetch(`${BACKEND_URL}/archivo-inspeccion/importar?${q}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, mensaje: d?.detail ? String(d.detail) : 'No se pudo importar la inspección.' };
    return { ok: true, edificacionId: String(d.edificacion_id), avisos: d.avisos ?? [] };
  } catch {
    return { ok: false, mensaje: 'No se pudo conectar con el backend. Revisá que esté abierto.' };
  }
}
