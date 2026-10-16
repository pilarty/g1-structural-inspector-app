import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRobots, guardarRobot, eliminarRobot, type RobotNube } from './robots';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton, SecondaryButton } from './components';
import RobotConnectionSection from './RobotConnectionConfig';
import { PanelPrueba, PruebaEnRecuadro, RobotsGuardados, DialogoReconexion, DialogoEliminar, CabeceraRobot, DatosConexion, SinRobots } from './RobotPrueba';
import {
  CAMPOS_CONEXION, aConexionGuardada, autorizarMovimiento, avisos as calcularAvisos, consultarActivo, desconectarRobot,
  detectarInterfaces, formularioDesdePerfil,
  formularioVacio, MODELO_SIMULADOR, NOMBRE_REPETIDO, probarConexion, reconectar, validar,
  type CampoForm, type Errores, type InterfazRed, type ResultadoPrueba, type RobotForm,
} from './robotConexion';

interface NewRobotProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCancel: () => void;
}

const CAMPO_DUPLICADO: Record<string, CampoForm> = { codigo: 'codigo' };

/** Identifica la configuración probada: si cambia, la prueba anterior ya no vale. */
const claveConexion = (f: RobotForm) => JSON.stringify([aConexionGuardada(f), f.sshPassword]);

interface Reconexion {
  robot: RobotNube;
  prueba: ResultadoPrueba | null;
  conectando: boolean;
  autorizado: boolean;
}

/** 'ver': robots guardados + conexión del elegido. 'formulario': añadir o editar un robot. */
type Modo = 'ver' | 'formulario';

export default function NewRobot({ activeTab, onTabChange }: NewRobotProps) {
  const { robots, cargando, error: errorRobots, recargar } = useRobots();
  const [modo, setModo] = useState<Modo>('ver');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<RobotForm>(formularioVacio);
  const [tocados, setTocados] = useState<Set<CampoForm>>(new Set());
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<Errores>({});

  const [interfaces, setInterfaces] = useState<InterfazRed[] | null>(null);
  const [detectando, setDetectando] = useState(false);
  const interfazManual = useRef(false);

  const [prueba, setPrueba] = useState<ResultadoPrueba | null>(null);
  const [clavePrueba, setClavePrueba] = useState<string | null>(null);
  const [probando, setProbando] = useState(false);
  const [errorPrueba, setErrorPrueba] = useState<string | null>(null);
  const abortar = useRef<AbortController | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardar, setMensajeGuardar] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [reconexion, setReconexion] = useState<Reconexion | null>(null);
  const [eliminando, setEliminando] = useState<{ robot: RobotNube; enviando: boolean; error: string | null } | null>(null);

  useEffect(() => () => abortar.current?.abort(), []);

  const otros = useMemo(() => robots.filter(r => r.id !== editandoId), [robots, editandoId]);
  const errores = useMemo(() => ({ ...validar(form, otros), ...erroresServidor }), [form, otros, erroresServidor]);
  const completo = Object.keys(errores).length === 0;
  const puedeProbar = CAMPOS_CONEXION.every(c => !errores[c]);
  const erroresVisibles = useMemo(() => {
    const v: Errores = {};
    for (const [c, msg] of Object.entries(errores) as [CampoForm, string][]) {
      if (intentoGuardar || tocados.has(c) || erroresServidor[c] || msg === NOMBRE_REPETIDO) v[c] = msg;
    }
    return v;
  }, [errores, tocados, intentoGuardar, erroresServidor]);
  const pruebaVigente = prueba && clavePrueba === claveConexion(form) ? prueba : null;

  // ── Interfaces de red: se detectan al abrir y cuando cambia el host ──
  async function detectar(host = form.host) {
    setDetectando(true);
    try {
      const r = await detectarInterfaces(host);
      setInterfaces(r.interfaces);
      if (!interfazManual.current) setForm(f => ({ ...f, interfaz: r.sugerida ?? '' }));
    } catch {
      setInterfaces([]);
    } finally {
      setDetectando(false);
    }
  }
  useEffect(() => {
    const t = setTimeout(() => detectar(form.host), 400);
    return () => clearTimeout(t);
  }, [form.host]); // eslint-disable-line react-hooks/exhaustive-deps

  function cambiar(cambio: Partial<RobotForm>) {
    if ('interfaz' in cambio) interfazManual.current = true;
    setForm(f => ({ ...f, ...cambio }));
    setMensajeGuardar(null);
    const campos = Object.keys(cambio) as CampoForm[];
    if (campos.some(c => erroresServidor[c])) {
      setErroresServidor(e => Object.fromEntries(Object.entries(e).filter(([c]) => !campos.includes(c as CampoForm))));
    }
  }

  function tocar(c: CampoForm) {
    setTocados(t => (t.has(c) ? t : new Set(t).add(c)));
  }

  function cargarFormulario(f: RobotForm, id: string | null) {
    abortar.current?.abort();
    interfazManual.current = !!f.interfaz;
    setForm(f);
    setEditandoId(id);
    setTocados(new Set());
    setIntentoGuardar(false);
    setErroresServidor({});
    setPrueba(null);
    setClavePrueba(null);
    setErrorPrueba(null);
    setProbando(false);
    setMensajeGuardar(null);
  }

  function cargarRobot(r: RobotNube) {
    if (r.modelo === MODELO_SIMULADOR) cargarFormulario({ ...formularioVacio(), codigo: r.label, simulador: true }, r.id);
    else if (r.conexion) cargarFormulario(formularioDesdePerfil(r.label, r.conexion), r.id);
    else cargarFormulario({ ...formularioVacio(), codigo: r.label }, r.id);
  }

  /** Muestra la conexión del robot (sin formulario). */
  function seleccionar(r: RobotNube) {
    cargarRobot(r);
    setModo('ver');
  }

  function editar(r: RobotNube) {
    cargarRobot(r);
    setModo('formulario');
  }

  function nuevo() {
    cargarFormulario(formularioVacio(), null);
    setModo('formulario');
  }

  function cancelarFormulario() {
    const r = robots.find(x => x.id === editandoId) ?? robots[0];
    if (r) seleccionar(r);
    else {
      cargarFormulario(formularioVacio(), null);
      setModo('ver');
    }
  }

  // Al abrir la pantalla (o si se borra el elegido) se muestra el primer robot guardado
  useEffect(() => {
    if (modo === 'ver' && robots.length && !robots.some(r => r.id === editandoId)) seleccionar(robots[0]);
  }, [robots, modo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Prueba de conexión ──
  async function probar() {
    abortar.current?.abort();
    const ctrl = new AbortController();
    abortar.current = ctrl;
    setProbando(true);
    setErrorPrueba(null);
    setClavePrueba(claveConexion(form));
    try {
      await probarConexion(form, editandoId ?? undefined, setPrueba, ctrl.signal);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErrorPrueba('No se pudo ejecutar la prueba. Revisá que el backend local esté funcionando.');
    } finally {
      if (abortar.current === ctrl) setProbando(false);
    }
  }

  // ── Guardar (no abre ninguna conexión con el robot) ──
  async function guardar() {
    setIntentoGuardar(true);
    setMensajeGuardar(null);
    if (!completo || guardando) return;
    setGuardando(true);
    const credenciales: { ssh_password?: string } = {};
    if (form.sshPassword || !editandoId) credenciales.ssh_password = form.sshPassword;
    const sim = form.simulador;
    const r = await guardarRobot({
      codigo: form.codigo.trim(),
      unidad: sim ? MODELO_SIMULADOR : form.modelo,
      conexion: sim ? null : aConexionGuardada(form),
      credenciales: sim ? {} : credenciales,
      ultima_prueba_fecha: sim ? null : pruebaVigente?.fecha ?? null,
      ultima_prueba: !sim && pruebaVigente
        ? { resultado: pruebaVigente.resultado, tipo: pruebaVigente.tipo, interfaz: pruebaVigente.interfaz, pasos: pruebaVigente.pasos }
        : null,
    }, editandoId ?? undefined);
    setGuardando(false);
    if ('id' in r) {
      setEditandoId(r.id);
      setForm(f => ({ ...f, sshPassword: '' }));
      setClavePrueba(null);
      setModo('ver');
      recargar();
    } else if (r.tipo === 'duplicado' && CAMPO_DUPLICADO[r.campo]) {
      setErroresServidor({ [CAMPO_DUPLICADO[r.campo]]: NOMBRE_REPETIDO });
    } else {
      setMensajeGuardar({ tipo: 'error', texto: 'No se pudo guardar el robot. Revisá tu conexión e intentá de nuevo.' });
    }
  }

  // ── Reconexión con un perfil guardado ──
  async function conectar(robot: RobotNube) {
    abortar.current?.abort();
    const ctrl = new AbortController();
    abortar.current = ctrl;
    setReconexion({ robot, prueba: null, conectando: true, autorizado: false });
    try {
      await reconectar(robot.id, p => setReconexion(r => (r && r.robot.id === robot.id ? { ...r, prueba: p } : r)), ctrl.signal);
      recargar();
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setReconexion(r => r && {
        ...r,
        prueba: {
          fecha: new Date().toISOString(), resultado: 'error', tipo: 'rapida', interfaz: null,
          pasos: [{ id: 'red', nombre: 'Perfil', limite_s: 0, estado: 'error', mensaje: 'No se pudo leer el perfil guardado en la nube.' }],
        },
      });
    } finally {
      setReconexion(r => (r && r.robot.id === robot.id ? { ...r, conectando: false } : r));
    }
  }

  // ── Eliminar (pide confirmación; si el robot estaba conectado, la app lo olvida) ──
  async function confirmarEliminar() {
    if (!eliminando) return;
    const { robot } = eliminando;
    setEliminando({ robot, enviando: true, error: null });
    const r = await eliminarRobot(robot.id);
    if (r.ok) {
      const activo = await consultarActivo().catch(() => null);
      if (activo?.conectado && String(activo.id) === robot.id) await desconectarRobot().catch(() => {});
      setEliminando(null);
      recargar();
      return;
    }
    setEliminando({
      robot,
      enviando: false,
      error: r.motivo === 'en_uso'
        ? `No se puede eliminar: ya se usó en ${r.relevamientos} relevamiento${r.relevamientos === 1 ? '' : 's'} y se perdería ese historial.`
        : 'No se pudo eliminar. Revisá tu conexión e intentá de nuevo.',
    });
  }

  function cerrarReconexion() {
    if (reconexion?.conectando) abortar.current?.abort();
    setReconexion(null);
  }

  const editandoRobot = robots.find(r => r.id === editandoId);
  const avisosForm = calcularAvisos(form);
  const advertenciaPrueba = !pruebaVigente
    ? prueba ? 'Cambiaste la configuración después de la última prueba.' : 'Todavía no probaste la conexión.'
    : pruebaVigente.resultado === 'error' ? 'La última prueba de conexión tuvo fallos.' : null;

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />

        <div className="flex-1 overflow-y-auto bg-[#F3F6F9]">
          <div className="w-full max-w-[1600px] mx-auto px-6 xl:px-8 py-8">

            <div className="mb-6">
              <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight">Robot</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1">
                {modo === 'formulario'
                  ? editandoId ? `Editando ${editandoRobot?.label ?? 'robot'}.` : 'Nuevo robot: completá sus datos, probá la conexión y guardalo.'
                  : 'Tus Unitree G1 guardados. Elegí uno para probar su conexión o conectarlo.'}
              </p>
            </div>

            <div className="grid grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] items-start gap-5 xl:gap-6">

              {/* Izquierda — robots guardados (siempre visible) */}
              <div className="sticky top-0">
                <RobotsGuardados
                  robots={robots}
                  cargando={cargando}
                  error={errorRobots}
                  seleccionado={editandoId}
                  creando={modo === 'formulario' && editandoId === null}
                  onSeleccionar={seleccionar}
                  onNuevo={nuevo}
                />
              </div>

              {/* Derecha — el robot elegido, o el formulario al añadir / editar */}
              <div className="min-w-0 space-y-6">
                {modo === 'ver' && !editandoRobot && <SinRobots cargando={cargando} onNuevo={nuevo} />}

                {modo === 'ver' && editandoRobot && (
                  <>
                    <CabeceraRobot
                      robot={editandoRobot}
                      conectando={!!reconexion?.conectando}
                      onConectar={() => conectar(editandoRobot)}
                      onEditar={() => editar(editandoRobot)}
                      onEliminar={() => setEliminando({ robot: editandoRobot, enviando: false, error: null })}
                    >
                      <PruebaEnRecuadro
                        prueba={prueba}
                        probando={probando}
                        puedeProbar={puedeProbar && !!editandoRobot.conexion}
                        motivoNoProbar={editandoRobot.modelo === MODELO_SIMULADOR
                          ? 'Es un simulador: no hace falta probar la conexión.'
                          : 'Este robot todavía no tiene datos de conexión. Pulsá «Configurar».'}
                        onProbar={probar}
                      />
                    </CabeceraRobot>
                    {errorPrueba && <p className="text-[12px] text-[#991B1B] px-1">{errorPrueba}</p>}
                    <DatosConexion robot={editandoRobot} />
                  </>
                )}

                {modo === 'formulario' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] items-start gap-6">
                    <RobotConnectionSection
                      key={editandoId ?? 'nuevo'}
                      form={form}
                      onChange={cambiar}
                      errores={erroresVisibles}
                      onBlur={tocar}
                      avisos={avisosForm}
                      editando={!!editandoId}
                      interfaces={interfaces}
                      detectandoInterfaces={detectando}
                      onDetectarInterfaces={() => detectar()}
                      pie={
                        <div className="space-y-3">
                          {advertenciaPrueba && completo && !form.simulador && (
                            <p className="text-[11px] font-medium text-[#92400E] bg-[#FFFBEB] px-3.5 py-2.5 rounded-xl">
                              {advertenciaPrueba} Podés guardar igual, pero conviene probarla antes.
                            </p>
                          )}
                          {intentoGuardar && !completo && (
                            <p className="text-[12px] text-[#991B1B]">Corregí los campos marcados para poder guardar.</p>
                          )}
                          {mensajeGuardar && (
                            <p className={`text-[12px] ${mensajeGuardar.tipo === 'ok' ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>{mensajeGuardar.texto}</p>
                          )}
                          <div className="flex items-center justify-end gap-5">
                            <SecondaryButton onClick={cancelarFormulario}>Cancelar</SecondaryButton>
                            <PrimaryButton onClick={guardar} disabled={guardando} shadow>
                              {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Guardar robot'}
                            </PrimaryButton>
                          </div>
                        </div>
                      }
                    />
                    <div className="sticky top-0 space-y-2 min-w-0">
                      {!form.simulador && <PanelPrueba
                        prueba={prueba}
                        probando={probando}
                        puedeProbar={puedeProbar}
                        motivoNoProbar="Completá la IP, el usuario y el puerto SSH y el Domain ID para probar."
                        onProbar={probar}
                      />}
                      {errorPrueba && <p className="text-[12px] text-[#991B1B] px-1">{errorPrueba}</p>}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {eliminando && (
        <DialogoEliminar
          robot={eliminando.robot}
          enviando={eliminando.enviando}
          error={eliminando.error}
          onConfirmar={confirmarEliminar}
          onCerrar={() => setEliminando(null)}
        />
      )}

      {reconexion && (
        <DialogoReconexion
          robot={reconexion.robot}
          prueba={reconexion.prueba}
          conectando={reconexion.conectando}
          autorizado={reconexion.autorizado}
          onEditar={() => { const r = reconexion.robot; setReconexion(null); editar(r); }}
          onAutorizar={async c => {
            await autorizarMovimiento(c);
            setReconexion(r => r && { ...r, autorizado: true });
          }}
          onCerrar={cerrarReconexion}
        />
      )}
    </div>
  );
}
