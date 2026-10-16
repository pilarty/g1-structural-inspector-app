import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Login, { type PedidoClave } from './Login';

export const BACKEND_URL = 'http://localhost:8000';

interface SesionCtx {
  usuario: string;
  cerrar: () => void;
  /** Cambia el nombre que se muestra (después de editarlo en el perfil) */
  renombrar: (nombre: string) => void;
  /** Vuelve al login sin llamar al backend (la sesión ya no existe, p. ej. al eliminar la cuenta) */
  salir: () => void;
  /** Cierra la sesión y abre el inicio en el paso de cambiar la contraseña (el correo ya se mandó) */
  irACambiarClave: (pedido: PedidoClave) => void;
}

const SesionContext = createContext<SesionCtx | null>(null);

export function useSesion(): SesionCtx {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return ctx;
}

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'sin-backend' }
  | { tipo: 'sin-sesion' }
  | { tipo: 'ok'; usuario: string };

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [pedidoClave, setPedidoClave] = useState<PedidoClave | null>(null);

  const consultar = useCallback(async () => {
    setEstado({ tipo: 'cargando' });
    try {
      const res = await fetch(`${BACKEND_URL}/nube/estado`);
      const data = await res.json();
      setEstado(
        data.sesion ? { tipo: 'ok', usuario: data.usuario ?? 'Usuario' } : { tipo: 'sin-sesion' },
      );
    } catch {
      setEstado({ tipo: 'sin-backend' });
    }
  }, []);

  useEffect(() => {
    consultar();
  }, [consultar]);

  async function iniciar(usuario: string, clave: string): Promise<string | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/nube/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, clave }),
      });
      if (res.status === 401) return 'Usuario o contraseña incorrectos.';
      if (!res.ok) return 'No se pudo iniciar sesión. Intenta de nuevo.';
      const data = await res.json();
      setPedidoClave(null);
      setEstado({ tipo: 'ok', usuario: data.usuario ?? usuario });
      return null;
    } catch {
      return 'No se pudo conectar con el backend local.';
    }
  }

  async function cerrar() {
    try {
      await fetch(`${BACKEND_URL}/nube/logout`, { method: 'POST' });
    } catch {
      // si el backend no responde, igual volvemos al login
    }
    setEstado({ tipo: 'sin-sesion' });
  }

  if (estado.tipo === 'ok') {
    return (
      <SesionContext.Provider value={{
        usuario: estado.usuario,
        cerrar,
        renombrar: nombre => setEstado({ tipo: 'ok', usuario: nombre }),
        salir: () => setEstado({ tipo: 'sin-sesion' }),
        irACambiarClave: async pedido => { setPedidoClave(pedido); await cerrar(); },
      }}>
        {children}
      </SesionContext.Provider>
    );
  }

  return <Login key={pedidoClave ? 'clave' : 'login'} estado={estado.tipo} onLogin={iniciar} onReintentar={consultar} pedidoClave={pedidoClave} />;
}
