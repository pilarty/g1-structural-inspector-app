/** La base guarda las fechas en UTC sin zona ("2026-10-03T18:55:12"); les agregamos la Z. */
export function aDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const conZona = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
  const d = new Date(conZona);
  return isNaN(d.getTime()) ? null : d;
}

/** "3 oct 2026" */
export function fechaLarga(iso?: string | null): string {
  const d = aDate(iso);
  if (!d) return '—';
  return d
    .toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\./g, '')
    .replace(/ de /g, ' ');
}

/** "15:55 hs" (hora local) */
export function horaLocal(iso?: string | null): string {
  const d = aDate(iso);
  if (!d) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} hs`;
}

export function duracion(u?: { inicio: string | null; fin: string | null; estado: string }): string {
  const ini = aDate(u?.inicio);
  if (!ini) return '—';
  const fin = aDate(u?.fin);
  if (!fin) return u?.estado === 'en_curso' ? 'En curso' : '—';
  const seg = Math.max(0, Math.round((fin.getTime() - ini.getTime()) / 1000));
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m >= 10) return `${m} min`;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

export function hace(iso?: string | null): string {
  const d = aDate(iso);
  if (!d) return '—';
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

export function etiquetaEstado(estado?: string): string {
  switch (estado) {
    case 'finalizado': return 'Completado';
    case 'en_curso': return 'En curso';
    case 'programado': return 'Programado';
    default: return estado || '—';
  }
}
