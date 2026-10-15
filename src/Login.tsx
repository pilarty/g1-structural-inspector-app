import React, { useState } from 'react';
import PrimaryButton from './components/PrimaryButton';
import TurquoiseCard from './components/TurquoiseCard';
import { PanelLabel } from './components/PanelText';

type EstadoLogin = 'cargando' | 'sin-backend' | 'sin-sesion';

interface LoginProps {
  estado: EstadoLogin;
  onLogin: (usuario: string, clave: string) => Promise<string | null>;
  onReintentar: () => void;
}

const inputClase =
  'w-full px-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-md border border-[#377DC0]/15 focus:border-[#377DC0]/40 text-[13px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-colors';

export default function Login({ estado, onLogin, onReintentar }: LoginProps) {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !clave || enviando) return;
    setEnviando(true);
    setError(null);
    const mensaje = await onLogin(usuario.trim(), clave);
    if (mensaje) {
      setError(mensaje);
      setClave('');
    }
    setEnviando(false);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[#FFFFFF] font-sans text-[#1A1C1E] px-6">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="text-[22px] font-bold tracking-tight">G1 Structural Inspector</h1>
          <p className="text-[13px] text-[#8A8C8E] mt-1.5">Inicia sesión para continuar</p>
        </div>

        <TurquoiseCard size="lg" bordered>
          <div className="px-5 py-5">
            {estado === 'cargando' && (
              <p className="text-[13px] text-[#8A8C8E] text-center py-4">Conectando con el backend…</p>
            )}

            {estado === 'sin-backend' && (
              <div className="text-center">
                <p className="text-[13px] text-[#991B1B] mb-4">
                  No se pudo conectar con el backend local. Verifica que esté corriendo y vuelve a intentar.
                </p>
                <PrimaryButton onClick={onReintentar}>Reintentar</PrimaryButton>
              </div>
            )}

            {estado === 'sin-sesion' && (
              <form onSubmit={enviar} className="flex flex-col gap-4">
                <div>
                  <PanelLabel className="mb-1.5">Usuario o correo</PanelLabel>
                  <input
                    type="text"
                    autoFocus
                    autoComplete="username"
                    value={usuario}
                    onChange={e => setUsuario(e.target.value)}
                    className={inputClase}
                  />
                </div>
                <div>
                  <PanelLabel className="mb-1.5">Contraseña</PanelLabel>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={clave}
                    onChange={e => setClave(e.target.value)}
                    className={inputClase}
                  />
                </div>
                {error && <p className="text-[12px] text-[#991B1B]">{error}</p>}
                <PrimaryButton type="submit" variant="full" disabled={enviando || !usuario.trim() || !clave}>
                  {enviando ? 'Ingresando…' : 'Iniciar sesión'}
                </PrimaryButton>
              </form>
            )}
          </div>
        </TurquoiseCard>
      </div>
    </div>
  );
}
