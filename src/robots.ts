import { useEffect, useState } from 'react';
import { BACKEND_URL } from './sesion';

interface RobotApi {
  id: number;
  codigo: string | null;
  unidad: string | null;
  estado: string | null;
}

export interface RobotNube {
  id: string;
  label: string;
  modelo: string;
  estado: string;
  /** true si la conexión del robot se configuró en ESTA PC */
  configured: boolean;
}

const clave = (id: number | string) => `g1:robot:${id}:conexion`;

/** Marca que el robot tiene su conexión configurada en esta PC (se guarda sin contraseñas). */
export function marcarConexionConfigurada(id: number, config: unknown): void {
  try {
    localStorage.setItem(clave(id), JSON.stringify(config));
  } catch {
    // sin almacenamiento disponible
  }
}

function tieneConexion(id: number): boolean {
  try {
    return localStorage.getItem(clave(id)) !== null;
  } catch {
    return false;
  }
}

export function useRobots() {
  const [robots, setRobots] = useState<RobotNube[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/nube/api/robots`);
        if (!res.ok) throw new Error(String(res.status));
        const data: RobotApi[] = await res.json();
        if (cancelado) return;
        setRobots(
          data.map(r => ({
            id: String(r.id),
            label: r.codigo ?? `Robot ${r.id}`,
            modelo: r.unidad ?? '',
            estado: r.estado ?? '',
            configured: tieneConexion(r.id),
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
  }, []);

  return { robots, cargando, error };
}
