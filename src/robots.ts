import { useCallback, useEffect, useState } from 'react';
import { BACKEND_URL } from './sesion';
import type { ConexionGuardada, ResultadoPrueba } from './robotConexion';

interface RobotApi {
  id: number;
  codigo: string | null;
  unidad: string | null;
  estado: string | null;
  conexion?: ConexionGuardada | null;
  ultima_prueba_fecha?: string | null;
  ultima_prueba?: Pick<ResultadoPrueba, 'resultado' | 'tipo' | 'interfaz'> | null;
}

export interface RobotNube {
  id: string;
  label: string;
  modelo: string;
  estado: string;
  /** Perfil de conexión guardado (sin contraseñas); null si nunca se configuró */
  conexion: ConexionGuardada | null;
  /** true si tiene un perfil de conexión guardado */
  configured: boolean;
  ultimaPruebaFecha: string | null;
  ultimaPruebaResultado: 'ok' | 'error' | null;
}

export function useRobots() {
  const [robots, setRobots] = useState<RobotNube[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/nube/api/robots`);
        if (!res.ok) throw new Error(String(res.status));
        const data: RobotApi[] = await res.json();
        if (cancelado) return;
        setError(null);
        setRobots(
          data.map(r => ({
            id: String(r.id),
            label: r.codigo ?? `Robot ${r.id}`,
            modelo: r.unidad ?? '',
            estado: r.estado ?? '',
            conexion: r.conexion ?? null,
            configured: !!r.conexion,
            ultimaPruebaFecha: r.ultima_prueba_fecha ?? null,
            ultimaPruebaResultado: r.ultima_prueba?.resultado ?? null,
          })),
        );
      } catch {
        if (!cancelado) setError('No se pudieron cargar los robots desde la nube.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [version]);

  return { robots, cargando, error, recargar };
}

export interface GuardarRobotIn {
  codigo: string;
  unidad: string;
  conexion: ConexionGuardada;
  /** Solo las contraseñas que cambiaron; se cifran en el servidor */
  credenciales: { ssh_password?: string };
  ultima_prueba_fecha: string | null;
  ultima_prueba: Omit<ResultadoPrueba, 'fecha'> | null;
}

export type ResultadoEliminar = { ok: true } | { ok: false; motivo: 'en_uso'; relevamientos: number } | { ok: false; motivo: 'red' };

/** Borra el robot de la nube. Si ya se usó en relevamientos, la nube no lo borra. */
export async function eliminarRobot(id: string): Promise<ResultadoEliminar> {
  try {
    const res = await fetch(`${BACKEND_URL}/nube/api/robots/${id}`, { method: 'DELETE' });
    if (res.status === 409) {
      const d = await res.json().catch(() => ({}));
      return { ok: false, motivo: 'en_uso', relevamientos: Number(d.relevamientos) || 0 };
    }
    return res.ok ? { ok: true } : { ok: false, motivo: 'red' };
  } catch {
    return { ok: false, motivo: 'red' };
  }
}

export type ErrorGuardar = { tipo: 'duplicado'; campo: string } | { tipo: 'red' };

/** Crea (sin id) o actualiza el robot en la nube. No inicia ninguna conexión con el robot. */
export async function guardarRobot(datos: GuardarRobotIn, id?: string): Promise<{ id: string } | ErrorGuardar> {
  try {
    const res = await fetch(`${BACKEND_URL}/nube/api/robots${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...datos, estado: 'activo' }),
    });
    if (res.status === 409) {
      const d = await res.json().catch(() => ({}));
      return { tipo: 'duplicado', campo: d.campo ?? '' };
    }
    if (!res.ok) return { tipo: 'red' };
    const creado = await res.json();
    return { id: String(creado.id ?? id) };
  } catch {
    return { tipo: 'red' };
  }
}
