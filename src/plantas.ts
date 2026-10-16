// Plantas (pisos) de una edificación, para elegir cuál se inspecciona y filtrar el recorrido.

export const PLANTA_BAJA = 'Planta baja';

/** Lista ordenada de abajo hacia arriba: subsuelos, planta baja y pisos. */
export function plantasDe(pisosSobrePb?: number | null, subsuelos?: number | null): string[] {
  const lista: string[] = [];
  for (let i = Math.min(subsuelos ?? 0, 10); i >= 1; i--) lista.push(`Subsuelo ${i}`);
  lista.push(PLANTA_BAJA);
  for (let i = 1; i <= Math.min(pisosSobrePb ?? 0, 60); i++) lista.push(`Piso ${i}`);
  return lista;
}

/** Posición de una planta para ordenarlas (subsuelos primero). */
export function ordenPlanta(p: string): number {
  if (p === PLANTA_BAJA) return 0;
  const n = Number(p.replace(/\D+/g, '')) || 0;
  return p.startsWith('Subsuelo') ? -n : p.startsWith('Piso') ? n : 1000;
}
