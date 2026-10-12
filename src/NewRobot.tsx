import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRobots, guardarRobot, type RobotNube } from './robots';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton, SecondaryButton } from './components';
import RobotConnectionSection, { ConnectionJsonPreview } from './RobotConnectionConfig';
import { PanelPrueba, RobotsGuardados, DialogoReconexion } from './RobotPrueba';
import {
  CAMPOS_CONEXION, aConexionGuardada, autorizarMovimiento, avisos as calcularAvisos,
  consultarEstado, detectarInterfaces, estadoSegunPrueba, exportarDiagnostico, formularioDesdePerfil,
  formularioVacio, jsonEnmascarado, probarConexion, reconectar, validar,
  type CampoForm, type Errores, type EstadoRobot, type InterfazRed, type ResultadoPrueba, type RobotForm,
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

export default function NewRobot({ activeTab, onTabChange, onCancel }: NewRobotProps) {
  const { robots, cargando, error: errorRobots, recargar } = useRobots();
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

  const [estadoRobot, setEstadoRobot] = useState<{ estado: EstadoRobot; mensaje?: string; cargando: boolean }>({ estado: 'desconocido', cargando: false });
  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardar, setMensajeGuardar] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [reconexion, setReconexion] = useState<Reconexion | null>(null);

  useEffect(() => () => abortar.current?.abort(), []);

  const otros = useMemo(() => robots.filter(r => r.id !== editandoId), [robots, editandoId]);
  const errores = useMemo(() => ({ ...validar(form, otros), ...erroresServidor }), [form, otros, erroresServidor]);
  const completo = Object.keys(errores).length === 0;
  const puedeProbar = CAMPOS_CONEXION.every(c => !errores[c]);
  const erroresVisibles = useMemo(() => {
    const v: Errores = {};
    for (const [c, msg] of Object.entries(errores) as [CampoForm, string][]) {
      if (intentoGuardar || tocados.has(c) || erroresServidor[c]) v[c] = msg;
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
    setEstadoRobot({ estado: 'desconocido', cargando: false });
  }

  function editar(r: RobotNube) {
    if (r.conexion) cargarFormulario(formularioDesdePerfil(r.label, r.conexion), r.id);
    else cargarFormulario({ ...formularioVacio(), codigo: r.label }, r.id);
  }

  // ── Prueba de conexión ──
  async function probar() {
    abortar.current?.abort();
    const ctrl = new AbortController();
    abortar.current = ctrl;
    setProbando(true);
    setErrorPrueba(null);
    setClavePrueba(claveConexion(form));
    setEstadoRobot(d => ({ ...d, cargando: true }));
    try {
      const r = await probarConexion(form, editandoId ?? undefined, setPrueba, ctrl.signal);
      setEstadoRobot({ estado: estadoSegunPrueba(r), mensaje: r.pasos.find(p => p.id === 'dds')?.mensaje, cargando: false });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErrorPrueba('No se pudo ejecutar la prueba. Revisá que el backend local esté funcionando.');
      setEstadoRobot(d => ({ ...d, cargando: false }));
    } finally {
      if (abortar.current === ctrl) setProbando(false);
    }
  }

  async function refrescarEstado() {
    if (!puedeProbar) {
      setEstadoRobot({ estado: 'desconocido', mensaje: 'Completá la IP, el usuario SSH y el Domain ID para consultar.', cargando: false });
      return;
    }
    setEstadoRobot(d => ({ ...d, cargando: true }));
    try {
      const r = await consultarEstado(form, editandoId ?? undefined);
      setEstadoRobot({ ...r, cargando: false });
    } catch {
      setEstadoRobot({ estado: 'desconocido', mensaje: 'No se pudo consultar el estado al backend local.', cargando: false });
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
    const r = await guardarRobot({
      codigo: form.codigo.trim(),
      unidad: form.modelo,
      conexion: aConexionGuardada(form),
      credenciales,
      ultima_prueba_fecha: pruebaVigente?.fecha ?? null,
      ultima_prueba: pruebaVigente
        ? { resultado: pruebaVigente.resultado, tipo: pruebaVigente.tipo, interfaz: pruebaVigente.interfaz, pasos: pruebaVigente.pasos }
        : null,
    }, editandoId ?? undefined);
    setGuardando(false);
    if ('id' in r) {
      setEditandoId(r.id);
      setForm(f => ({ ...f, sshPassword: '' }));
      setClavePrueba(null);
      setMensajeGuardar({ tipo: 'ok', texto: 'Robot guardado. Podés conectarlo desde la lista de robots guardados.' });
      recargar();
    } else if (r.tipo === 'duplicado' && CAMPO_DUPLICADO[r.campo]) {
      setErroresServidor({ [CAMPO_DUPLICADO[r.campo]]: 'Ya existe otro de tus robots con este valor.' });
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

        <div className="flex-1 overflow-y-auto bg-[#FFFFFF]">
          <div className="w-full px-8 py-8">

            <div className="mb-6">
              <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight">
                {editandoId ? `Editar ${editandoRobot?.label ?? 'robot'}` : 'Añadir robot'}
              </h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1">
                Registrá un Unitree G1, probá que la conexión funciona y guardá el perfil para reconectarlo sin volver a cargar nada.
              </p>
            </div>

            <div className="flex items-start gap-6">

              {/* Izquierda — robots guardados */}
              <div className="w-[230px] flex-none">
                <RobotsGuardados
                  robots={robots}
                  cargando={cargando}
                  error={errorRobots}
                  seleccionado={editandoId}
                  conectandoId={reconexion?.conectando ? reconexion.robot.id : null}
                  onConectar={conectar}
                  onEditar={editar}
                  onNuevo={() => cargarFormulario(formularioVacio(), null)}
                />
              </div>

              {/* Centro — formulario */}
              <div className="flex-1 min-w-0">
                <RobotConnectionSection
                  form={form}
                  onChange={cambiar}
                  errores={erroresVisibles}
                  onBlur={tocar}
                  completo={completo}
                  avisos={avisosForm}
                  editando={!!editandoId}
                  interfaces={interfaces}
                  detectandoInterfaces={detectando}
                  onDetectarInterfaces={() => detectar()}
                  estadoRobot={estadoRobot}
                  onRefrescarEstado={refrescarEstado}
                />

                <ConnectionJsonPreview datos={jsonEnmascarado(form, !!editandoId)} />

                <div className="pt-6 space-y-3">
                  {advertenciaPrueba && completo && (
                    <p className="text-[11px] font-medium text-[#92400E] bg-[#FFFBEB] px-3.5 py-2.5 rounded-xl">
                      {advertenciaPrueba} Podés guardar igual, pero conviene probarla antes.
                    </p>
                  )}
                  <div className="flex items-center gap-5">
                    <PrimaryButton onClick={guardar} disabled={guardando}>
                      {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Guardar robot'}
                    </PrimaryButton>
                    <SecondaryButton onClick={onCancel}>Cancelar</SecondaryButton>
                  </div>
                  {intentoGuardar && !completo && (
                    <p className="text-[12px] text-[#991B1B]">Corregí los campos marcados para poder guardar.</p>
                  )}
                  {mensajeGuardar && (
                    <p className={`text-[12px] ${mensajeGuardar.tipo === 'ok' ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>{mensajeGuardar.texto}</p>
                  )}
                </div>
              </div>

              {/* Derecha — prueba de conexión */}
              <div className="w-[340px] flex-none sticky top-0 space-y-2">
                <PanelPrueba
                  prueba={prueba}
                  probando={probando}
                  puedeProbar={puedeProbar}
                  motivoNoProbar="Completá la IP, el usuario y el puerto SSH y el Domain ID para probar."
                  onProbar={probar}
                  onExportar={() => prueba && exportarDiagnostico(form, prueba, !!editandoId)}
                />
                {errorPrueba && <p className="text-[12px] text-[#991B1B] px-1">{errorPrueba}</p>}
              </div>

            </div>
          </div>
        </div>
      </div>

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
