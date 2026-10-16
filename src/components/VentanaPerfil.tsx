import React, { useEffect, useState } from 'react';
import { Loader2, LogOut, X } from 'lucide-react';
import { BACKEND_URL, useSesion } from '../sesion';
import { Campo, claseEntrada } from './Formulario';
import { tarjetaBlanca } from '../tokens';

type Seccion = 'perfil' | 'seguridad' | 'cuenta';
interface Perfil { nombre: string; apellido: string; email: string | null; usuario: string; mostrar: string | null }
type Aviso = { ok: boolean; texto: string } | null;

const SECCIONES: { id: Seccion; etiqueta: string }[] = [
  { id: 'perfil', etiqueta: 'Perfil' },
  { id: 'seguridad', etiqueta: 'Seguridad' },
  { id: 'cuenta', etiqueta: 'Cuenta' },
];

/** Lee el mensaje de error que manda el backend ({ detail: "..." }). */
async function mensajeDe(r: Response, porDefecto: string) {
  try {
    const d = await r.json();
    return typeof d?.detail === 'string' ? d.detail : porDefecto;
  } catch {
    return porDefecto;
  }
}

async function enviarJson(ruta: string, metodo: 'POST' | 'PUT', cuerpo?: unknown) {
  return fetch(`${BACKEND_URL}${ruta}`, {
    method: metodo, headers: { 'Content-Type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

const iniciales = (texto: string) =>
  texto.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?';

/** Ventana de perfil y configuración: datos, contraseña, cerrar sesión y eliminar la cuenta. */
export default function VentanaPerfil({ onCerrar }: { onCerrar: () => void }) {
  const { usuario, cerrar, renombrar, salir, irACambiarClave } = useSesion();
  const [seccion, setSeccion] = useState<Seccion>('perfil');
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/nube/perfil`).then(r => (r.ok ? r.json() : null)).then(d => d && setPerfil(d)).catch(() => {});
  }, []);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  const nombre = perfil?.mostrar || usuario;

  return (
    <div className="fixed inset-0 z-50 bg-[#14202B]/20 backdrop-blur-[3px] flex items-center justify-center p-6"
      onMouseDown={e => e.target === e.currentTarget && onCerrar()} role="dialog" aria-modal="true" aria-label="Perfil y configuración">
      <div className="w-full max-w-[880px] h-[540px] bg-white rounded-xl border border-[#D4D4D4] shadow-[0_12px_48px_rgba(20,32,43,0.24)] overflow-hidden flex">
        {/* Izquierda: secciones */}
        <aside className="w-[220px] flex-none flex flex-col bg-white border-r border-[#14202B]/[0.07]">
          <div className="px-5 pt-5 pb-4">
            <h2 className="text-[16px] font-bold text-[#1A1C1E] tracking-tight">Configuración</h2>
          </div>
          <nav className="flex-1 px-3 space-y-0.5">
            {SECCIONES.map(s => {
              const activa = seccion === s.id;
              return (
                <button key={s.id} type="button" onClick={() => setSeccion(s.id)} aria-current={activa ? 'page' : undefined}
                  className={`relative w-full h-9 pl-4 pr-3 rounded-md text-left text-[13px] transition-colors ${
                    activa ? 'bg-[#EEF4FB] text-[#1E4E7C] font-semibold' : 'text-[#66686A] font-medium hover:bg-[#F3F6F9] hover:text-[#1A1C1E]'
                  }`}>
                  {activa && <span className="absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-[#377DC0]" />}
                  {s.etiqueta}
                </button>
              );
            })}
          </nav>
          {/* Quién está conectado */}
          <div className="m-3 p-3 rounded-lg bg-[#F3F6F9] flex items-center gap-2.5">
            <Avatar texto={nombre} tamano="chico" />
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-[#1A1C1E] truncate">{nombre}</span>
              <span className="block text-[11px] text-[#8A8C8E] truncate">{perfil?.email ?? 'Sesión iniciada'}</span>
            </span>
          </div>
        </aside>

        {/* Derecha: la sección elegida, con tarjetas blancas sobre el gris (mismo tamaño siempre) */}
        <section className="flex-1 min-w-0 flex flex-col bg-[#F3F6F9]">
          <div className="flex items-center h-14 px-6">
            <h3 className="flex-1 text-[18px] font-bold text-[#1A1C1E] tracking-tight">{SECCIONES.find(s => s.id === seccion)?.etiqueta}</h3>
            <button type="button" onClick={onCerrar} aria-label="Cerrar"
              className="w-8 h-8 -mr-1.5 flex items-center justify-center rounded-[4px] text-[#616161] hover:bg-black/[0.06]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
            {seccion === 'perfil' && (
              <SeccionPerfil perfil={perfil} nombreMostrado={nombre}
                onCambio={p => { setPerfil(p); if (p.mostrar) renombrar(p.mostrar); }} />
            )}
            {seccion === 'seguridad' && (
              <SeccionSeguridad email={perfil?.email ?? null}
                onCambiarAhora={destino => { onCerrar(); irACambiarClave({ usuario: perfil?.usuario ?? perfil?.email ?? '', destino }); }} />
            )}
            {seccion === 'cuenta' && (
              <SeccionCuenta nombre={nombre} email={perfil?.email ?? null}
                onCerrarSesion={() => { onCerrar(); cerrar(); }} onEliminada={() => { onCerrar(); salir(); }} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Perfil: nombre, apellido y correo ──
function SeccionPerfil({ perfil, nombreMostrado, onCambio }: {
  perfil: Perfil | null; nombreMostrado: string; onCambio: (p: Perfil) => void;
}) {
  const [nombre, setNombre] = useState(perfil?.nombre ?? '');
  const [apellido, setApellido] = useState(perfil?.apellido ?? '');
  const [email, setEmail] = useState(perfil?.email ?? '');
  // Correo nuevo esperando el código que le llegó
  const [emailPendiente, setEmailPendiente] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  useEffect(() => {
    setNombre(perfil?.nombre ?? ''); setApellido(perfil?.apellido ?? ''); setEmail(perfil?.email ?? '');
  }, [perfil]);

  const cambioDatos = !!perfil && nombre.trim() !== '' && (nombre.trim() !== perfil.nombre || apellido.trim() !== perfil.apellido);
  const cambioEmail = !!perfil && email.trim() !== '' && email.trim().toLowerCase() !== (perfil.email ?? '').toLowerCase();

  async function guardar() {
    if (!perfil) return;
    setGuardando(true);
    setAviso(null);
    try {
      let actual = perfil;
      if (cambioDatos) {
        const r = await enviarJson('/nube/perfil', 'PUT', { nombre: nombre.trim(), apellido: apellido.trim() });
        if (!r.ok) { setAviso({ ok: false, texto: await mensajeDe(r, 'No se pudieron guardar los datos.') }); return; }
        const d = await r.json();
        actual = { ...actual, nombre: nombre.trim(), apellido: apellido.trim(), mostrar: d.mostrar ?? actual.mostrar };
        onCambio(actual);
      }
      if (cambioEmail) {
        const nuevo = email.trim().toLowerCase();
        const r = await enviarJson('/nube/perfil/email', 'POST', { email: nuevo });
        if (!r.ok) { setAviso({ ok: false, texto: await mensajeDe(r, 'No se pudo cambiar el correo.') }); return; }
        setEmailPendiente(nuevo);
        setCodigo('');
        return;
      }
      setAviso({ ok: true, texto: 'Cambios guardados.' });
    } catch {
      setAviso({ ok: false, texto: 'No se pudo conectar con el backend.' });
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEmail() {
    if (!perfil || !emailPendiente) return;
    setGuardando(true);
    setAviso(null);
    try {
      const r = await enviarJson('/nube/perfil/email/confirmar', 'POST', { email: emailPendiente, codigo: codigo.trim() });
      if (!r.ok) { setAviso({ ok: false, texto: await mensajeDe(r, 'No se pudo confirmar el correo.') }); return; }
      onCambio({ ...perfil, email: emailPendiente, mostrar: perfil.mostrar === perfil.email ? emailPendiente : perfil.mostrar });
      setEmailPendiente(null);
      setAviso({ ok: true, texto: 'Correo cambiado.' });
    } catch {
      setAviso({ ok: false, texto: 'No se pudo conectar con el backend.' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className={`${tarjetaBlanca} px-5 py-4 flex items-center gap-4`}>
        <Avatar texto={nombreMostrado} tamano="grande" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[#1A1C1E] truncate">{nombreMostrado}</p>
          <p className="text-[13px] text-[#8A8C8E] truncate">{perfil?.email ?? ' '}</p>
        </div>
      </div>

      <Tarjeta titulo="Datos personales">
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Nombre">
            <input value={nombre} onChange={e => { setNombre(e.target.value); setAviso(null); }} maxLength={40} className={claseEntrada()} />
          </Campo>
          <Campo etiqueta="Apellido">
            <input value={apellido} onChange={e => { setApellido(e.target.value); setAviso(null); }} maxLength={40} className={claseEntrada()} />
          </Campo>
          <Campo etiqueta="Correo" className="col-span-2">
            <input type="email" value={email} disabled={!!emailPendiente}
              onChange={e => { setEmail(e.target.value); setAviso(null); }} className={`${claseEntrada()} disabled:opacity-60`} />
          </Campo>
        </div>

        {emailPendiente ? (
          <div className="mt-4 rounded-md bg-[#EEF4FB] border border-[#377DC0]/20 px-4 py-3">
            <p className="text-[13px] text-[#1A1C1E]">Te mandamos un código a <b className="font-semibold">{emailPendiente}</b>.</p>
            <div className="mt-2.5 flex items-center gap-2">
              <input value={codigo} onChange={e => { setCodigo(e.target.value); setAviso(null); }} placeholder="Código" inputMode="numeric"
                autoFocus className={`${claseEntrada()} !h-9 !bg-white max-w-[180px]`} />
              <BotonPrimario onClick={confirmarEmail} deshabilitado={!codigo.trim() || guardando} cargando={guardando}>Confirmar</BotonPrimario>
              <button type="button" onClick={() => { setEmailPendiente(null); setEmail(perfil?.email ?? ''); setAviso(null); }}
                className="h-9 px-3 rounded-[3px] text-[13px] font-medium text-[#66686A] hover:bg-black/[0.05]">
                Cancelar
              </button>
              {aviso && !aviso.ok && <span className="text-[12px] text-[#991B1B]">{aviso.texto}</span>}
            </div>
          </div>
        ) : (
          <Pie aviso={aviso}>
            <BotonPrimario onClick={guardar} deshabilitado={!(cambioDatos || cambioEmail) || guardando} cargando={guardando}>Guardar cambios</BotonPrimario>
          </Pie>
        )}
      </Tarjeta>
    </>
  );
}

// ── Seguridad: la contraseña se cambia con un código que llega por correo ──
function SeccionSeguridad({ email, onCambiarAhora }: { email: string | null; onCambiarAhora: (destino: string) => void }) {
  const [enviando, setEnviando] = useState(false);
  const [destino, setDestino] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const r = await enviarJson('/nube/perfil/clave/enviar', 'POST');
      if (!r.ok) { setError(await mensajeDe(r, 'No se pudo mandar el correo.')); return; }
      const d = await r.json();
      setDestino(d.destino || email || 'tu correo');
    } catch {
      setError('No se pudo conectar con el backend.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={tarjetaBlanca}>
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-bold text-[#1A1C1E]">Contraseña</h4>
          <p className="text-[12px] text-[#8A8C8E] mt-0.5">Se cambia con un código que te mandamos por correo.</p>
        </div>
        <BotonSecundario onClick={enviar} deshabilitado={enviando} cargando={enviando}>
          {destino ? 'Reenviar correo' : 'Enviar correo'}
        </BotonSecundario>
      </div>
      {(destino || error) && (
        <div className={`px-5 py-3.5 border-t ${error ? 'border-[#FCA5A5]/60 bg-[#FEF2F2]' : 'border-[#A7F3D0] bg-[#ECFDF5]'} flex items-center gap-4`}>
          {error ? (
            <p className="flex-1 text-[12px] text-[#991B1B]">{error}</p>
          ) : (
            <>
              <p className="flex-1 text-[13px] text-[#065F46]">Te mandamos un código a <b className="font-semibold">{destino}</b>.</p>
              <BotonPrimario onClick={() => onCambiarAhora(destino ?? '')} deshabilitado={false} cargando={false}>Usar el código</BotonPrimario>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cuenta: cerrar sesión y eliminar la cuenta ──
function SeccionCuenta({ nombre, email, onCerrarSesion, onEliminada }: {
  nombre: string; email: string | null; onCerrarSesion: () => void; onEliminada: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function eliminar() {
    setEnviando(true);
    setError(null);
    try {
      const r = await enviarJson('/nube/perfil/eliminar', 'POST', { clave });
      if (!r.ok) { setError(await mensajeDe(r, 'No se pudo eliminar la cuenta.')); setClave(''); return; }
      onEliminada();
    } catch {
      setError('No se pudo conectar con el backend.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {/* Sesión */}
      <div className={`${tarjetaBlanca} px-5 py-4 flex items-center gap-4`}>
        <Avatar texto={nombre} tamano="mediano" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#1A1C1E] truncate">{nombre}</p>
          <p className="text-[12px] text-[#8A8C8E] truncate">Sesión iniciada{email && email !== nombre ? ` como ${email}` : ''}</p>
        </div>
        <button type="button" onClick={onCerrarSesion}
          className="flex-none flex items-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6]">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>

      {/* Eliminar cuenta */}
      <div className={tarjetaBlanca}>
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-bold text-[#B91C1C]">Eliminar cuenta</h4>
            <p className="text-[12px] text-[#8A8C8E] mt-0.5">Ya no vas a poder entrar. Los proyectos e inspecciones quedan guardados.</p>
          </div>
          {!confirmando && (
            <button type="button" onClick={() => setConfirmando(true)}
              className="flex-none h-9 px-3.5 rounded-[3px] text-[13px] font-medium bg-white text-[#B91C1C] border border-[#FCA5A5] hover:bg-[#FEF2F2]">
              Eliminar cuenta
            </button>
          )}
        </div>
        {confirmando && (
          <div className="px-5 py-4 border-t border-[#FCA5A5]/60 bg-[#FEF2F2]/60">
            <p className="text-[12px] text-[#7F1D1D] mb-2.5">Escribí tu contraseña para confirmar. No se puede deshacer.</p>
            <div className="flex items-center gap-2">
              <input type="password" autoFocus autoComplete="current-password" value={clave} placeholder="Contraseña"
                onChange={e => { setClave(e.target.value); setError(null); }}
                className={`${claseEntrada(error ?? undefined)} !h-9 !bg-white flex-1`} />
              <button type="button" onClick={() => { setConfirmando(false); setClave(''); setError(null); }}
                className="h-9 px-3.5 rounded-[3px] text-[13px] font-medium bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6]">
                Cancelar
              </button>
              <button type="button" onClick={eliminar} disabled={!clave || enviando}
                className="flex items-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium bg-[#B91C1C] text-white hover:bg-[#991B1B] disabled:bg-[#E5E7EB] disabled:text-[#A0A2A4]">
                {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                Eliminar
              </button>
            </div>
            {error && <p className="text-[12px] text-[#991B1B] mt-2">{error}</p>}
          </div>
        )}
      </div>
    </>
  );
}

// ── Piezas compartidas ──

/** Tarjeta blanca con título, como los bloques de las otras pantallas. */
function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className={`${tarjetaBlanca} px-5 pt-4 pb-4`}>
      <h4 className="text-[13px] font-bold text-[#1A1C1E] mb-4">{titulo}</h4>
      {children}
    </div>
  );
}

function Avatar({ texto, tamano }: { texto: string; tamano: 'chico' | 'mediano' | 'grande' }) {
  const clase = tamano === 'chico' ? 'w-8 h-8 text-[12px]' : tamano === 'mediano' ? 'w-10 h-10 text-[14px]' : 'w-14 h-14 text-[18px]';
  return (
    <span className={`flex-none rounded-full bg-[#377DC0] text-white font-semibold flex items-center justify-center ${clase}`}>
      {iniciales(texto)}
    </span>
  );
}

function Pie({ aviso, children }: { aviso: Aviso; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 mt-4">
      {aviso && <span className={`text-[12px] ${aviso.ok ? 'text-[#047857]' : 'text-[#991B1B]'}`}>{aviso.texto}</span>}
      {children}
    </div>
  );
}

function BotonPrimario({ onClick, deshabilitado, cargando, children }: {
  onClick: () => void; deshabilitado: boolean; cargando: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={deshabilitado}
      className="flex-none flex items-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium bg-[#377DC0] text-white hover:bg-[#2F6CA8] disabled:bg-[#E5E7EB] disabled:text-[#A0A2A4]">
      {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

function BotonSecundario({ onClick, deshabilitado, cargando, children }: {
  onClick: () => void; deshabilitado: boolean; cargando: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={deshabilitado}
      className="flex-none flex items-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6] disabled:opacity-60">
      {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
