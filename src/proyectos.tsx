import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BACKEND_URL } from './sesion';
import type { Building, Project, SeverityLevel } from './data';
import { aDate, fechaLarga, hace } from './formato';

interface ProyectoApi {
  id: number;
  nombre: string;
}

interface EdificacionApi {
  id: number;
  proyecto_id: number;
  nombre: string | null;
  direccion: string | null;
  cantidad_plantas: number | null;
  anio_construccion: number | null;
  latitud?: number | string | null;
  longitud?: number | string | null;
}

interface ResumenApi {
  id: number;
  edificacion_id: number;
  estado: string | null;
  fecha_programada: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  robot: string | null;
  operador: string | null;
  detecciones: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// Edificio "vacío": se usa cuando todavía no hay ninguno seleccionado o cargado.
export const EDIFICIO_VACIO: Building = {
  id: '',
  name: 'Sin edificio',
  address: '',
  floors: 0,
  yearBuilt: 0,
  relevamientos: 0,
  lastRelevamiento: 'Sin relevamientos',
  lastRelevamientoDate: '—',
  lastDetections: 0,
  highestSeverity: 'low',
  planStatus: 'unconfigured',
  lastSeverityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
  lastRobot: '—',
  lastOperator: '—',
  riskZones: [],
  historial: [],
};

function mayorSeveridad(r: { critical: number; high: number; medium: number }): SeverityLevel {
  if (r.critical > 0) return 'critical';
  if (r.high > 0) return 'high';
  if (r.medium > 0) return 'medium';
  return 'low';
}

function aIso(valor: string | null): string | null {
  return aDate(valor)?.toISOString() ?? null;
}

// `rels` viene ordenado del relevamiento más reciente al más antiguo
function aEdificio(e: EdificacionApi, rels: ResumenApi[]): Building {
  const base: Building = {
    ...EDIFICIO_VACIO,
    id: String(e.id),
    name: e.nombre ?? 'Sin nombre',
    address: e.direccion ?? '',
    floors: e.cantidad_plantas ?? 0,
    yearBuilt: e.anio_construccion ?? 0,
    lat: e.latitud != null ? Number(e.latitud) : undefined,
    lon: e.longitud != null ? Number(e.longitud) : undefined,
  };
  if (rels.length === 0) return base;

  const ult = rels[0];
  return {
    ...base,
    relevamientos: rels.length,
    lastRelevamiento: ult.estado === 'en_curso' ? 'En curso' : hace(ult.fecha_inicio),
    lastRelevamientoDate: fechaLarga(ult.fecha_inicio),
    lastDetections: ult.detecciones,
    highestSeverity: mayorSeveridad(ult),
    lastSeverityBreakdown: { low: ult.low, medium: ult.medium, high: ult.high, critical: ult.critical },
    lastRobot: ult.robot ?? '—',
    lastOperator: ult.operador ?? '—',
    historial: rels.map(r => ({
      id: r.id,
      date: fechaLarga(r.fecha_inicio),
      detections: r.detecciones,
      severity: mayorSeveridad(r),
      robot: r.robot ?? '—',
      operador: r.operador ?? '—',
      estado: r.estado ?? '',
      inicio: aIso(r.fecha_inicio),
      fin: aIso(r.fecha_fin),
      breakdown: { low: r.low, medium: r.medium, high: r.high, critical: r.critical },
    })),
    ultimoRelevamiento: {
      id: ult.id,
      estado: ult.estado ?? '',
      inicio: aIso(ult.fecha_inicio),
      fin: aIso(ult.fecha_fin),
    },
  };
}

interface ProyectosCtx {
  proyectos: Project[];
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
}

const ProyectosContext = createContext<ProyectosCtx | null>(null);

export function useProyectos(): ProyectosCtx {
  const ctx = useContext(ProyectosContext);
  if (!ctx) throw new Error('useProyectos debe usarse dentro de ProyectosProvider');
  return ctx;
}

export function ProyectosProvider({ children }: { children: React.ReactNode }) {
  const [proyectos, setProyectos] = useState<Project[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cargoAntes = useRef(false);

  const recargar = useCallback(async () => {
    if (!cargoAntes.current) setCargando(true);
    setError(null);
    try {
      const [rp, re, rr] = await Promise.all([
        fetch(`${BACKEND_URL}/nube/api/proyectos`),
        fetch(`${BACKEND_URL}/nube/api/edificaciones`),
        fetch(`${BACKEND_URL}/nube/api/resumen/relevamientos`),
      ]);
      if (!rp.ok || !re.ok) throw new Error(`respuesta ${rp.status}/${re.status}`);
      const ps: ProyectoApi[] = await rp.json();
      const es: EdificacionApi[] = await re.json();
      // Si el resumen falla, se muestran igual los proyectos y edificios (sin estadísticas)
      const resumen: ResumenApi[] = rr.ok ? await rr.json() : [];
      setProyectos(
        ps.map(p => ({
          id: String(p.id),
          name: p.nombre,
          buildings: es
            .filter(e => e.proyecto_id === p.id)
            .map(e => aEdificio(e, resumen.filter(r => r.edificacion_id === e.id))),
        })),
      );
      cargoAntes.current = true;
    } catch {
      setError('No se pudieron cargar los proyectos desde la nube.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return (
    <ProyectosContext.Provider value={{ proyectos, cargando, error, recargar }}>
      {children}
    </ProyectosContext.Provider>
  );
}
