import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton, SecondaryButton, PanelTitle } from './components';
import { tarjetaBlanca } from './tokens';
import { AreaTexto, Campo, Selector } from './components/Formulario';
import { useProyectos } from './proyectos';
import { useRobots } from './robots';
import { autorizarMovimiento, consultarActivo, MODELO_SIMULADOR, reconectar, type ResultadoPrueba } from './robotConexion';
import { PruebaEnRecuadro } from './RobotPrueba';
import { BACKEND_URL } from './sesion';
import { PLANTA_BAJA, plantasDe } from './plantas';
import { MOTIVOS } from './motivos';

interface InspectionSetupProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  /** Edificación elegida en la barra (se propone para la inspección) */
  edificioInicial?: string | null;
  /** Crear un proyecto o una edificación sin salir del flujo (al terminar se vuelve acá) */
  onNuevoProyecto?: () => void;
  onNuevaEdificacion?: (proyectoId: string) => void;
}

/** Elegir edificación y robot, y empezar una inspección (se crea en la nube). */
const NUEVO = '__nuevo__';

export default function InspectionSetup({ activeTab, onTabChange, edificioInicial, onNuevoProyecto, onNuevaEdificacion }: InspectionSetupProps) {
  const { proyectos } = useProyectos();
  const { robots, cargando: cargandoRobots, error: errorRobots } = useRobots();
  const [edificioId, setEdificioId] = useState(edificioInicial ?? '');
  // Proyecto: el de la edificación que llega elegida, si hay una
  const [proyectoId, setProyectoId] = useState(
    () => proyectos.find(p => p.buildings.some(b => b.id === edificioInicial))?.id ?? '');
  const [robotId, setRobotId] = useState('');
  const [planta, setPlanta] = useState(PLANTA_BAJA);
  const [motivo, setMotivo] = useState('rutina');
  const [observaciones, setObservaciones] = useState('');
  const [motivoOtro, setMotivoOtro] = useState(''); // lo que se escribe al elegir «Otro»
  const motivoFinal = motivo === 'otro' ? motivoOtro.trim() : motivo;
  const [conectado, setConectado] = useState<{ si: boolean; codigo?: string | null; autorizado?: boolean }>({ si: false });
  // Confirmaciones de seguridad para permitir que el robot real se mueva
  const [seguridad, setSeguridad] = useState({ espacio_despejado: false, soporte_seguridad: false, operador_con_control: false });
  const [autorizando, setAutorizando] = useState(false);
  const [errorAutorizar, setErrorAutorizar] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<number | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Prueba de conexión del robot elegido (se conecta con su perfil guardado)
  const [prueba, setPrueba] = useState<ResultadoPrueba | null>(null);
  const [probando, setProbando] = useState(false);
  const abortar = useRef<AbortController | null>(null);
  useEffect(() => () => abortar.current?.abort(), []);

  // Robot conectado ahora y si ya hay una inspección andando
  useEffect(() => {
    let vivo = true;
    const mirar = () => {
      consultarActivo().then(r => vivo && setConectado({ si: r.conectado, codigo: r.codigo, autorizado: !!r.movimiento_autorizado })).catch(() => vivo && setConectado({ si: false }));
      fetch(`${BACKEND_URL}/nube/estado`).then(r => r.json()).then(d => vivo && setEnCurso(d.relevamiento_id ?? null)).catch(() => {});
    };
    mirar();
    const t = setInterval(mirar, 4000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  // Si hay un solo robot, o el conectado está en la lista, se elige solo
  useEffect(() => {
    if (robotId || robots.length === 0) return;
    const delConectado = conectado.si ? robots.find(r => r.label === conectado.codigo) : undefined;
    if (delConectado) setRobotId(delConectado.id);
    else if (robots.length === 1) setRobotId(robots[0].id);
  }, [robots, conectado, robotId]);

  // Si los proyectos cargan después, se completa el proyecto de la edificación elegida
  useEffect(() => {
    if (proyectoId || !edificioId) return;
    const p = proyectos.find(x => x.buildings.some(b => b.id === edificioId));
    if (p) setProyectoId(p.id);
  }, [proyectos, edificioId, proyectoId]);
  const proyecto = proyectos.find(p => p.id === proyectoId);
  const opcionesProyecto = [
    ...proyectos.map(p => ({ valor: p.id, etiqueta: p.name })),
    ...(onNuevoProyecto ? [{ valor: NUEVO, etiqueta: '+ Nuevo proyecto…' }] : []),
  ];
  const opcionesEdificio = [
    ...(proyecto?.buildings ?? []).map(b => ({ valor: b.id, etiqueta: b.name })),
    ...(proyecto && onNuevaEdificacion ? [{ valor: NUEVO, etiqueta: '+ Nueva edificación…' }] : []),
  ];
  function elegirEdificio(id: string) {
    if (id === NUEVO) { if (proyecto) onNuevaEdificacion?.(proyecto.id); return; }
    setEdificioId(id);
  }
  function elegirProyecto(id: string) {
    if (id === NUEVO) { onNuevoProyecto?.(); return; }
    setProyectoId(id);
    const delProyecto = proyectos.find(p => p.id === id)?.buildings ?? [];
    // Si la edificación elegida no es de ese proyecto, se limpia (o se elige sola si hay una sola)
    if (!delProyecto.some(b => b.id === edificioId)) setEdificioId(delProyecto.length === 1 ? delProyecto[0].id : '');
  }
  const edificio = proyectos.flatMap(p => p.buildings).find(b => b.id === edificioId);
  const robot = robots.find(r => r.id === robotId);
  const plantas = plantasDe(edificio?.pisos, edificio?.subsuelos);
  // Si se cambia de edificación y esa planta no existe, vuelve a planta baja
  useEffect(() => { if (!plantas.includes(planta)) setPlanta(PLANTA_BAJA); }, [edificioId]); // eslint-disable-line react-hooks/exhaustive-deps
  const robotEsElConectado = !!robot && conectado.si && conectado.codigo === robot.label;
  const esSimulador = robot?.modelo === MODELO_SIMULADOR;
  const movimientoAutorizado = robotEsElConectado && !!conectado.autorizado;
  // Un robot real solo puede iniciar conectado y con el movimiento autorizado; el simulador, siempre
  const robotListo = !!robot && (esSimulador || movimientoAutorizado);

  // Al cambiar de robot, la prueba anterior ya no vale
  useEffect(() => {
    abortar.current?.abort(); setPrueba(null); setProbando(false);
    setSeguridad({ espacio_despejado: false, soporte_seguridad: false, operador_con_control: false });
    setErrorAutorizar(null);
  }, [robotId]);

  async function autorizar() {
    setAutorizando(true);
    setErrorAutorizar(null);
    try {
      await autorizarMovimiento(seguridad);
      const a = await consultarActivo().catch(() => null);
      if (a) setConectado({ si: a.conectado, codigo: a.codigo, autorizado: !!a.movimiento_autorizado });
    } catch {
      setErrorAutorizar('No se pudo registrar la confirmación. Volvé a probar la conexión.');
    } finally {
      setAutorizando(false);
    }
  }

  async function probarRobot() {
    if (!robot) return;
    abortar.current?.abort();
    const ctrl = new AbortController();
    abortar.current = ctrl;
    setProbando(true);
    try {
      await reconectar(robot.id, setPrueba, ctrl.signal);
      const a = await consultarActivo().catch(() => null);
      if (a) setConectado({ si: a.conectado, codigo: a.codigo, autorizado: !!a.movimiento_autorizado });
    } catch {
      // si se cancela o falla, el resultado queda en la lista de pasos
    } finally {
      if (abortar.current === ctrl) setProbando(false);
    }
  }

  async function iniciar() {
    if (!edificio || !robotListo || !motivoFinal || iniciando) return;
    setIniciando(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/nube/relevamientos/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edificacion_id: Number(edificio.id), robot_id: Number(robot.id), planta, motivo: motivoFinal, observaciones: observaciones.trim() || null }),
      });
      if (res.status === 401) {
        setError('La sesión se cerró (¿reiniciaste el backend?). Cerrá sesión y volvé a entrar.');
        setIniciando(false);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      onTabChange('inspeccion-en-curso');
    } catch {
      setError('No se pudo iniciar la inspección. Revisá que el backend esté abierto y tu conexión, e intentá de nuevo.');
      setIniciando(false);
    }
  }

  // Lo que falta (o está bien) antes de empezar, para el panel de la derecha
  const pasos: { ok: boolean; aviso?: boolean; titulo: string; detalle: string }[] = [
    { ok: !!edificio, titulo: 'Edificación', detalle: edificio ? edificio.name : 'Sin elegir' },
    { ok: !!edificio, titulo: 'Planta', detalle: edificio ? planta : 'Sin elegir' },
    {
      ok: !!motivoFinal,
      aviso: motivo === 'otro' && !motivoFinal,
      titulo: 'Motivo',
      detalle: motivo === 'otro' ? (motivoFinal || 'Falta escribirlo') : (MOTIVOS.find(m => m.valor === motivo)?.etiqueta ?? '—'),
    },
    { ok: !!robot, titulo: 'Robot', detalle: robot ? robot.label : 'Sin elegir' },
    {
      ok: !!robot && (robotEsElConectado || esSimulador),
      aviso: !!robot && !robotEsElConectado && !esSimulador,
      titulo: 'Conexión',
      detalle: !robot ? '—' : esSimulador ? 'Simulador' : robotEsElConectado ? 'Conectado' : 'Sin conectar',
    },
    ...(robot && !esSimulador ? [{
      ok: movimientoAutorizado,
      aviso: !movimientoAutorizado,
      titulo: 'Movimiento',
      detalle: movimientoAutorizado ? 'Autorizado' : 'Sin autorizar',
    }] : []),
  ];
  const listo = !!edificio && robotListo && !!motivoFinal;

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <div className="flex-1 overflow-y-auto bg-[#F3F6F9]">
          <div className="w-full max-w-[1600px] mx-auto px-6 xl:px-8 py-8">
            <div className="mb-6">
              <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight">Iniciar inspección</h1>
            </div>

            {enCurso !== null && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[13px] text-[#065F46]">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse flex-none" />
                <span className="flex-1">Ya hay una inspección en curso. Si empezás otra, la anterior se da por terminada.</span>
                <SecondaryButton onClick={() => onTabChange('inspeccion-en-curso')}>Ver la inspección en curso</SecondaryButton>
              </div>
            )}

            <div className="grid grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_340px] items-start gap-5 xl:gap-6">
              {/* Izquierda — qué y con qué */}
              <div className={tarjetaBlanca}>
                <div className="px-6 pt-5 pb-4 border-b border-[#14202B]/[0.06]">
                  <PanelTitle>Nueva inspección</PanelTitle>
                </div>
                <div className="divide-y divide-[#14202B]/[0.06]">
                  <SeccionSetup titulo="Lugar">
                    <div className="grid grid-cols-3 gap-4">
                      <Campo etiqueta="Proyecto" obligatorio>
                        <Selector valor={proyectoId} onCambio={elegirProyecto} placeholder="Elegí el proyecto" opciones={opcionesProyecto} />
                      </Campo>
                      <Campo etiqueta="Edificación" obligatorio>
                        <Selector valor={edificioId} onCambio={elegirEdificio}
                          placeholder={!proyecto ? 'Primero elegí el proyecto' : (proyecto.buildings.length ? 'Elegí la edificación' : 'Este proyecto no tiene edificaciones')}
                          opciones={opcionesEdificio} />
                      </Campo>
                      <Campo etiqueta="Planta" obligatorio>
                        <Selector valor={planta} onCambio={setPlanta} opciones={plantas.map(p => ({ valor: p, etiqueta: p }))} />
                      </Campo>
                    </div>

                    {/* Resumen de la edificación elegida */}
                    {edificio && (
                      <dl className="mt-4 grid grid-cols-[2fr_1fr_1fr_1fr] rounded-md border border-[#E5E7EB] bg-[#F8F9FA] divide-x divide-[#E5E7EB]">
                        <Dato etiqueta="Dirección" valor={edificio.address || 'Sin dirección'} />
                        <Dato etiqueta="Inspecciones" valor={String(edificio.relevamientos)} />
                        <Dato etiqueta="Última" valor={edificio.relevamientos ? edificio.lastRelevamientoDate : '—'} />
                        <Dato etiqueta="Hallazgos en la última" valor={edificio.relevamientos ? String(edificio.lastDetections) : '—'} />
                      </dl>
                    )}
                  </SeccionSetup>

                  <SeccionSetup titulo="Detalles">
                    <div className="space-y-4">
                      <Campo etiqueta="Motivo" obligatorio>
                        {/* Opciones a la vista, como fichas; «Otro» deja escribirlo */}
                        <div className="flex flex-wrap items-center gap-2" role="radiogroup">
                          {[...MOTIVOS.map(m => ({ valor: m.valor, etiqueta: m.corta ?? m.etiqueta })), { valor: 'otro', etiqueta: 'Otro' }].map(m => {
                            const activo = motivo === m.valor;
                            return (
                              <button key={m.valor} type="button" role="radio" aria-checked={activo} onClick={() => setMotivo(m.valor)}
                                className={`flex items-center gap-2 h-9 px-3.5 rounded-md border text-[13px] transition-colors ${
                                  activo ? 'bg-[#EEF4FB] border-[#377DC0] text-[#1E4E7C] font-semibold'
                                    : 'bg-[#F8FAFC] border-[#377DC0]/15 text-[#1A1C1E] font-medium hover:border-[#377DC0]/40'
                                }`}>
                                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${activo ? 'border-[#377DC0]' : 'border-[#A0A2A4]'}`}>
                                  {activo && <span className="w-1.5 h-1.5 rounded-full bg-[#377DC0]" />}
                                </span>
                                {m.etiqueta}
                              </button>
                            );
                          })}
                          {motivo === 'otro' && (
                            <input autoFocus value={motivoOtro} onChange={e => setMotivoOtro(e.target.value)} maxLength={80}
                              placeholder="Escribí el motivo"
                              className="flex-1 min-w-[200px] h-9 px-3 rounded-md text-[13px] font-semibold text-[#1A1C1E] bg-white outline-none border border-[#377DC0] focus:ring-2 focus:ring-[#377DC0]/15 placeholder:text-[#A0A2A4] placeholder:font-normal" />
                          )}
                        </div>
                      </Campo>
                      <Campo etiqueta="Observaciones">
                        <AreaTexto valor={observaciones} onCambio={setObservaciones} filas={3}
                          placeholder="Iluminación, accesos, obstáculos…" />
                      </Campo>
                    </div>
                  </SeccionSetup>

                  <SeccionSetup titulo="Robot">
                    <div className="grid grid-cols-3 gap-4">
                      <Campo etiqueta="Robot" obligatorio>
                        <Selector valor={robotId} onCambio={setRobotId}
                          placeholder={cargandoRobots ? 'Cargando robots…' : errorRobots ? 'No se pudieron cargar' : robots.length ? 'Elegí el robot' : 'No hay robots registrados'}
                          opciones={robots.map(r => ({ valor: r.id, etiqueta: r.modelo ? `${r.label} · ${r.modelo}` : r.label }))} />
                      </Campo>
                    </div>
                    {errorRobots && (
                      <p className="mt-3 text-[12px] text-[#991B1B]">{errorRobots} Si reiniciaste el backend, cerrá sesión y volvé a entrar.</p>
                    )}
                    {!cargandoRobots && !errorRobots && robots.length === 0 && (
                      <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-md bg-[#F8F9FA] border border-[#E5E7EB] text-[13px]">
                        <span className="flex-1">Todavía no registraste ningún robot.</span>
                        <SecondaryButton onClick={() => onTabChange('nuevo-robot')}>Agregar robot</SecondaryButton>
                      </div>
                    )}
                  </SeccionSetup>
                  {robot && (
                    <PruebaEnRecuadro
                      prueba={prueba}
                      probando={probando}
                      puedeProbar={!esSimulador && !!robot.conexion}
                      motivoNoProbar={esSimulador
                        ? 'Es un simulador: no hace falta probar la conexión.'
                        : 'Este robot no tiene datos de conexión. Configuralo en la pantalla Robot.'}
                      onProbar={probarRobot}
                    />
                  )}
                  {robot && !esSimulador && robotEsElConectado && !movimientoAutorizado && (
                    <div className="px-6 pt-4 pb-5 border-t border-[#14202B]/[0.06]">
                      <h3 className="text-[13px] font-bold text-[#1A1C1E]">Permitir movimiento</h3>
                      <p className="text-[11px] text-[#8A8C8E] mt-0.5 mb-3">El robot está conectado y en reposo. Para que pueda recorrer, confirmá:</p>
                      <div className="space-y-2">
                        {([
                          ['espacio_despejado', 'El robot está en un espacio despejado.'],
                          ['soporte_seguridad', 'Está colgado del soporte de seguridad.'],
                          ['operador_con_control', 'Hay alguien a su lado con el control remoto.'],
                        ] as [keyof typeof seguridad, string][]).map(([clave, texto]) => (
                          <label key={clave} className="flex items-start gap-2 text-[13px] text-[#1A1C1E] cursor-pointer">
                            <input type="checkbox" checked={seguridad[clave]} onChange={e => setSeguridad({ ...seguridad, [clave]: e.target.checked })}
                              className="mt-0.5 accent-[#377DC0]" />
                            {texto}
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <button type="button" onClick={autorizar}
                          disabled={autorizando || !(seguridad.espacio_despejado && seguridad.soporte_seguridad && seguridad.operador_con_control)}
                          className="flex items-center justify-center gap-2 h-8 px-3 rounded-[3px] text-[13px] font-medium bg-[#377DC0] text-white hover:bg-[#2F6CA8] disabled:bg-[#E5E7EB] disabled:text-[#A0A2A4]">
                          {autorizando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Permitir movimiento
                        </button>
                        {errorAutorizar && <span className="text-[12px] text-[#991B1B]">{errorAutorizar}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Derecha — antes de empezar */}
              <div className="sticky top-0 space-y-2 min-w-0">
                <div className={tarjetaBlanca}>
                  <div className="px-5 pt-5 pb-4 border-b border-[#14202B]/[0.06]">
                    <PanelTitle>Antes de empezar</PanelTitle>
                  </div>
                  <ul className="p-3 space-y-1.5">
                    {pasos.map(p => (
                      <li key={p.titulo} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[#F8FAFC]">
                        <span className={`flex-none w-2 h-2 mt-1.5 rounded-full ${p.ok ? 'bg-[#10B981]' : p.aviso ? 'bg-[#F59E0B]' : 'bg-[#D4D4D4]'}`} />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-[#1A1C1E]">{p.titulo}</span>
                          <span className="block text-[12px] text-[#8A8C8E] leading-snug">{p.detalle}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="px-5 pb-5">
                    <PrimaryButton variant="full" onClick={iniciar} disabled={!listo || iniciando}
                      icon={iniciando ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}>
                      {iniciando ? 'Iniciando…' : 'Iniciar inspección'}
                    </PrimaryButton>
                    {error && <p className="text-[12px] text-[#991B1B] mt-2">{error}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0 px-4 py-2.5">
      <dt className="text-[11px] text-[#8A8C8E]">{etiqueta}</dt>
      <dd className="text-[13px] font-semibold text-[#1A1C1E] truncate">{valor}</dd>
    </div>
  );
}

/** Bloque del formulario, igual que en la pantalla Robot. */
function SeccionSetup({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="px-6 py-5">
      <h3 className="text-[13px] font-bold text-[#1A1C1E] leading-tight mb-4">{titulo}</h3>
      {children}
    </section>
  );
}
