import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { BACKEND_URL } from './sesion';

type EstadoLogin = 'cargando' | 'sin-backend' | 'sin-sesion';

/** Pedido de cambiar la contraseña que viene de la ventana de perfil (el correo ya se mandó). */
export interface PedidoClave { usuario: string; destino: string }

interface LoginProps {
  estado: EstadoLogin;
  onLogin: (usuario: string, clave: string) => Promise<string | null>;
  onReintentar: () => void;
  /** Si viene, se abre directo en el paso de escribir el código y la contraseña nueva */
  pedidoClave?: PedidoClave | null;
}

// login: entrar · registro: crear cuenta · confirmar: código del registro
// olvide: pedir el correo · codigo: código y contraseña nueva
type Modo = 'login' | 'registro' | 'confirmar' | 'olvide' | 'codigo';

const inputClase =
  'w-full h-11 px-3.5 rounded-md bg-white border border-[#377DC0]/15 hover:border-[#377DC0]/35 focus:border-[#377DC0] focus:ring-2 focus:ring-[#377DC0]/15 text-[15px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-shadow';

async function mensajeDe(r: Response, porDefecto: string) {
  try {
    const d = await r.json();
    return typeof d?.detail === 'string' ? d.detail : porDefecto;
  } catch {
    return porDefecto;
  }
}

async function enviarJson(ruta: string, cuerpo: unknown) {
  return fetch(`${BACKEND_URL}${ruta}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
  });
}

export default function Login({ estado, onLogin, onReintentar, pedidoClave }: LoginProps) {
  const [modo, setModo] = useState<Modo>(pedidoClave ? 'codigo' : 'login');
  const [usuario, setUsuario] = useState(pedidoClave?.usuario ?? '');
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [destino, setDestino] = useState(pedidoClave?.destino ?? '');
  // Usuario que devolvió el registro (puede no ser el correo) para confirmar y entrar
  const [usuarioRegistro, setUsuarioRegistro] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function irA(m: Modo) {
    setModo(m);
    setError(null);
    setAviso(null);
    setCodigo(''); setNueva(''); setRepetir('');
  }

  /** Ejecuta una acción mostrando «enviando» y atrapando la falta de conexión. */
  async function con(accion: () => Promise<void>) {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await accion();
    } catch {
      setError('No se pudo conectar con el backend local.');
    } finally {
      setEnviando(false);
    }
  }

  const entrar = (e: React.FormEvent) => { e.preventDefault(); con(async () => {
    const mensaje = await onLogin(usuario.trim(), clave);
    if (mensaje) { setError(mensaje); setClave(''); }
  }); };

  const registrar = (e: React.FormEvent) => { e.preventDefault(); con(async () => {
    if (clave !== repetir) { setError('Las contraseñas no coinciden.'); return; }
    const r = await enviarJson('/nube/registro', { nombre: nombre.trim(), apellido: apellido.trim(), email: usuario.trim(), clave });
    if (!r.ok) { setError(await mensajeDe(r, 'No se pudo crear la cuenta.')); return; }
    const d = await r.json();
    setUsuarioRegistro(d.usuario ?? usuario.trim());
    setModo('confirmar');
    setCodigo('');
  }); };

  const confirmar = (e: React.FormEvent) => { e.preventDefault(); con(async () => {
    const r = await enviarJson('/nube/registro/confirmar', { usuario: usuarioRegistro, codigo: codigo.trim() });
    if (!r.ok) { setError(await mensajeDe(r, 'No se pudo confirmar la cuenta.')); return; }
    // Cuenta confirmada: se entra directo
    const mensaje = await onLogin(usuario.trim(), clave);
    if (mensaje) { irA('login'); setAviso('Cuenta creada. Ya podés entrar.'); }
  }); };

  const reenviarRegistro = () => con(async () => {
    const r = await enviarJson('/nube/registro/reenviar', { usuario: usuarioRegistro });
    if (!r.ok) { setError(await mensajeDe(r, 'No se pudo reenviar el código.')); return; }
    setAviso('Te mandamos otro código.');
  });

  const pedirCodigo = (e: React.FormEvent) => { e.preventDefault(); con(async () => {
    const r = await enviarJson('/nube/clave/olvide', { usuario: usuario.trim() });
    if (!r.ok) { setError(await mensajeDe(r, 'No se pudo mandar el correo.')); return; }
    const d = await r.json();
    setDestino(d.destino ?? '');
    irA('codigo');
  }); };

  const restablecer = (e: React.FormEvent) => { e.preventDefault(); con(async () => {
    if (nueva !== repetir) { setError('Las contraseñas no coinciden.'); return; }
    const r = await enviarJson('/nube/clave/restablecer', { usuario: usuario.trim(), codigo: codigo.trim(), nueva });
    if (!r.ok) { setError(await mensajeDe(r, 'No se pudo cambiar la contraseña.')); return; }
    irA('login');
    setClave('');
    setAviso('Listo, ya podés entrar con la contraseña nueva.');
  }); };

  const subtitulo: Record<Modo, string> = {
    login: '',
    registro: 'Creá tu cuenta para empezar',
    confirmar: `Escribí el código que te llegó a ${usuario.trim() || 'tu correo'}`,
    olvide: 'Te mandamos un código para elegir una contraseña nueva',
    codigo: `Escribí el código que te llegó${destino ? ` a ${destino}` : ' por correo'}`,
  };

  return (
    <div className="flex h-screen items-center justify-center font-sans text-[#1A1C1E] px-6 bg-[#F3F6F9] bg-[radial-gradient(#DDE3EA_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="w-full max-w-[440px]">
        <div className="flex flex-col items-center text-center mb-7">
          <h1 className="text-[28px] font-bold tracking-tight">G1 Structural Inspector</h1>
          {estado === 'sin-sesion' && subtitulo[modo] && <p className="text-[15px] text-[#8A8C8E] mt-2">{subtitulo[modo]}</p>}
        </div>

        <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-[#E5E7EB] shadow-[0_8px_32px_rgba(20,32,43,0.10)] px-7 py-7">
          {estado === 'cargando' && (
            <p className="flex items-center justify-center gap-2 text-[13px] text-[#8A8C8E] py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Conectando con el backend…
            </p>
          )}

          {estado === 'sin-backend' && (
            <div className="text-center">
              <p className="text-[13px] text-[#991B1B] mb-4">
                No se pudo conectar con el backend local. Verificá que esté corriendo y volvé a intentar.
              </p>
              <Boton onClick={onReintentar}>Reintentar</Boton>
            </div>
          )}

          {estado === 'sin-sesion' && (
            <>
              {modo === 'login' && (
                <form onSubmit={entrar} className="flex flex-col gap-4">
                  {aviso && <Aviso>{aviso}</Aviso>}
                  <Campo etiqueta="Usuario o correo">
                    <input type="text" autoFocus autoComplete="username" value={usuario}
                      onChange={e => setUsuario(e.target.value)} className={inputClase} />
                  </Campo>
                  <Campo etiqueta="Contraseña" accion={
                    <button type="button" onClick={() => irA('olvide')} className="text-[14px] font-medium text-[#377DC0] hover:underline">
                      ¿Olvidaste tu contraseña?
                    </button>
                  }>
                    <input type="password" autoComplete="current-password" value={clave}
                      onChange={e => setClave(e.target.value)} className={inputClase} />
                  </Campo>
                  {error && <TextoError>{error}</TextoError>}
                  <Boton tipo="submit" deshabilitado={enviando || !usuario.trim() || !clave} cargando={enviando}>
                    {enviando ? 'Ingresando…' : 'Iniciar sesión'}
                  </Boton>
                  <p className="text-center text-[14px] text-[#8A8C8E]">
                    ¿No tenés una cuenta? <Enlace onClick={() => irA('registro')}>Registrate</Enlace>
                  </p>
                </form>
              )}

              {modo === 'registro' && (
                <form onSubmit={registrar} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="Nombre">
                      <input autoFocus autoComplete="given-name" value={nombre} onChange={e => { setNombre(e.target.value); setError(null); }} className={inputClase} />
                    </Campo>
                    <Campo etiqueta="Apellido">
                      <input autoComplete="family-name" value={apellido} onChange={e => { setApellido(e.target.value); setError(null); }} className={inputClase} />
                    </Campo>
                  </div>
                  <Campo etiqueta="Correo">
                    <input type="email" autoComplete="email" value={usuario} onChange={e => { setUsuario(e.target.value); setError(null); }} className={inputClase} />
                  </Campo>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="Contraseña">
                      <input type="password" autoComplete="new-password" value={clave} onChange={e => { setClave(e.target.value); setError(null); }} className={inputClase} />
                    </Campo>
                    <Campo etiqueta="Confirmar contraseña">
                      <input type="password" autoComplete="new-password" value={repetir} onChange={e => { setRepetir(e.target.value); setError(null); }} className={inputClase} />
                    </Campo>
                  </div>
                  <p className="-mt-1.5 text-[12px] text-[#8A8C8E]">Al menos 8 caracteres, con mayúsculas, minúsculas y números.</p>
                  {error && <TextoError>{error}</TextoError>}
                  <Boton tipo="submit" deshabilitado={enviando || !nombre.trim() || !usuario.includes('@') || clave.length < 8 || !repetir} cargando={enviando}>
                    {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
                  </Boton>
                  <p className="text-center text-[14px] text-[#8A8C8E]">
                    ¿Ya tenés una cuenta? <Enlace onClick={() => irA('login')}>Iniciá sesión</Enlace>
                  </p>
                </form>
              )}

              {modo === 'confirmar' && (
                <form onSubmit={confirmar} className="flex flex-col gap-4">
                  {aviso && <Aviso>{aviso}</Aviso>}
                  <Campo etiqueta="Código">
                    <input autoFocus inputMode="numeric" autoComplete="one-time-code" value={codigo}
                      onChange={e => { setCodigo(e.target.value); setError(null); }} className={`${inputClase} tracking-[0.2em] text-center font-semibold`} />
                  </Campo>
                  {error && <TextoError>{error}</TextoError>}
                  <Boton tipo="submit" deshabilitado={enviando || !codigo.trim()} cargando={enviando}>
                    {enviando ? 'Confirmando…' : 'Confirmar y entrar'}
                  </Boton>
                  <div className="flex justify-between">
                    <Enlace onClick={() => irA('registro')}>Volver</Enlace>
                    <Enlace onClick={reenviarRegistro}>Reenviar código</Enlace>
                  </div>
                </form>
              )}

              {modo === 'olvide' && (
                <form onSubmit={pedirCodigo} className="flex flex-col gap-4">
                  <Campo etiqueta="Usuario o correo">
                    <input type="text" autoFocus autoComplete="username" value={usuario}
                      onChange={e => { setUsuario(e.target.value); setError(null); }} className={inputClase} />
                  </Campo>
                  {error && <TextoError>{error}</TextoError>}
                  <Boton tipo="submit" deshabilitado={enviando || !usuario.trim()} cargando={enviando}>
                    {enviando ? 'Enviando…' : 'Enviar código'}
                  </Boton>
                  <Enlace onClick={() => irA('login')} centrado>Volver a iniciar sesión</Enlace>
                </form>
              )}

              {modo === 'codigo' && (
                <form onSubmit={restablecer} className="flex flex-col gap-4">
                  <Campo etiqueta="Código">
                    <input autoFocus inputMode="numeric" autoComplete="one-time-code" value={codigo}
                      onChange={e => { setCodigo(e.target.value); setError(null); }} className={`${inputClase} tracking-[0.2em] text-center font-semibold`} />
                  </Campo>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="Contraseña nueva">
                      <input type="password" autoComplete="new-password" value={nueva} onChange={e => { setNueva(e.target.value); setError(null); }} className={inputClase} />
                    </Campo>
                    <Campo etiqueta="Confirmar contraseña">
                      <input type="password" autoComplete="new-password" value={repetir} onChange={e => { setRepetir(e.target.value); setError(null); }} className={inputClase} />
                    </Campo>
                  </div>
                  {error && <TextoError>{error}</TextoError>}
                  <Boton tipo="submit" deshabilitado={enviando || !codigo.trim() || nueva.length < 8 || !repetir} cargando={enviando}>
                    {enviando ? 'Guardando…' : 'Cambiar contraseña'}
                  </Boton>
                  <Enlace onClick={() => irA('login')} centrado>Volver a iniciar sesión</Enlace>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ etiqueta, accion, children }: { etiqueta: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center mb-1.5">
        <span className="flex-1 text-[14px] font-semibold text-[#14202B]">{etiqueta}</span>
        {accion}
      </div>
      {children}
    </div>
  );
}

function Boton({ tipo = 'button', onClick, deshabilitado, cargando, children }: {
  tipo?: 'button' | 'submit'; onClick?: () => void; deshabilitado?: boolean; cargando?: boolean; children: React.ReactNode;
}) {
  return (
    <button type={tipo} onClick={onClick} disabled={deshabilitado}
      className="w-full flex items-center justify-center gap-2 h-11 rounded-[3px] text-[15px] font-semibold bg-[#377DC0] text-white hover:bg-[#2F6CA8] disabled:bg-[#E5E7EB] disabled:text-[#A0A2A4] transition-colors">
      {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

function Enlace({ onClick, centrado, children }: { onClick: () => void; centrado?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-[14px] font-medium text-[#377DC0] hover:underline ${centrado ? 'self-center' : ''}`}>
      {children}
    </button>
  );
}

const TextoError = ({ children }: { children: React.ReactNode }) => <p className="text-[13px] text-[#991B1B]">{children}</p>;
const Aviso = ({ children }: { children: React.ReactNode }) => (
  <p className="px-3 py-2 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[13px] text-[#065F46]">{children}</p>
);
