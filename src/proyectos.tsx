import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BACKEND_URL } from './sesion';
import type { Building, Project } from './data';
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
  pisos_sobre_pb?: number | null;
  subsuelos?: number | null;
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
  planStatus: 'unconfigured',
  lastRobot: '—',
  lastOperator: '—',
  historial: [],
};

function aIso(valor: string | null): string | null {
  return aDate(valor)?.toISOString() ?? null;
}

// `rels` viene ordenado del relevamiento más reciente al más antiguo
function aEdificio(e: EdificacionApi, rels: ResumenApi[], plantas: Map<number, DatosInicio>): Building {
  const base: Building = {
    ...EDIFICIO_VACIO,
    id: String(e.id),
    name: e.nombre ?? 'Sin nombre',
    address: e.direccion ?? '',
    floors: e.cantidad_plantas ?? 0,
    yearBuilt: e.anio_construccion ?? 0,
    pisos: e.pisos_sobre_pb ?? undefined,
    subsuelos: e.subsuelos ?? undefined,
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
    lastRobot: ult.robot ?? '—',
    lastOperator: ult.operador ?? '—',
    historial: rels.map(r => ({
      id: r.id,
      date: fechaLarga(r.fecha_inicio),
      detections: r.detecciones,
      robot: r.robot ?? '—',
      operador: r.operador ?? '—',
      estado: r.estado ?? '',
      inicio: aIso(r.fecha_inicio),
      fin: aIso(r.fecha_fin),
      planta: plantas.get(r.id)?.planta,
      motivo: plantas.get(r.id)?.motivo ?? undefined,
      observaciones: plantas.get(r.id)?.observaciones ?? undefined,
    })),
    ultimoRelevamiento: {
      id: ult.id,
      planta: plantas.get(ult.id)?.planta,
      motivo: plantas.get(ult.id)?.motivo ?? undefined,
      observaciones: plantas.get(ult.id)?.observaciones ?? undefined,
      estado: ult.estado ?? '',
      inicio: aIso(ult.fecha_inicio),
      fin: aIso(ult.fecha_fin),
    },
  };
}

/** Lo que se cargó al iniciar cada inspección */
interface DatosInicio { planta: string; motivo?: string | null; observaciones?: string | null }

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
      const [rp, re, rr, rpl] = await Promise.all([
        fetch(`${BACKEND_URL}/nube/api/proyectos`),
        fetch(`${BACKEND_URL}/nube/api/edificaciones`),
        fetch(`${BACKEND_URL}/nube/api/resumen/relevamientos`),
        fetch(`${BACKEND_URL}/nube/api/plantas`).catch(() => null),
      ]);
      if (!rp.ok || !re.ok) throw new Error(`respuesta ${rp.status}/${re.status}`);
      const ps: ProyectoApi[] = await rp.json();
      const es: EdificacionApi[] = await re.json();
      // Si el resumen falla, se muestran igual los proyectos y edificios (sin estadísticas)
      const resumen: ResumenApi[] = rr.ok ? await rr.json() : [];
      // Planta de cada inspección (si la nube todavía no tiene esa ruta, se sigue sin plantas)
      const listaPlantas: ({ relevamiento_id: number } & DatosInicio)[] = rpl?.ok ? await rpl.json() : [];
      const plantas = new Map(listaPlantas.map(x => [x.relevamiento_id, x]));
      setProyectos(
        ps.map(p => ({
          id: String(p.id),
          name: p.nombre,
          buildings: es
            .filter(e => e.proyecto_id === p.id)
            .map(e => aEdificio(e, resumen.filter(r => r.edificacion_id === e.id), plantas)),
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
