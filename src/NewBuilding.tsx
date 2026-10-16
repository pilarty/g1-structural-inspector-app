import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2, Check, CircleAlert, Download, Trash2, FileText, Home, Loader2, MapPin, Plus, Upload, X, Layers, RefreshCw,
} from 'lucide-react';
import { useProyectos } from './proyectos';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton, SecondaryButton, ProjectsSidebar } from './components';
import { Campo, Entrada, Selector, AreaTexto, Segmentado, Bloque, Solapa, MasDatos } from './components/Formulario';
import { DialogoNuevoProyecto } from './proyectoForm';
import DialogoConfirmar from './components/DialogoConfirmar';
import { registrarCambiosSinGuardar, salirSiSePuede } from './navegacion';
import {
  DESTINOS, DOCUMENTOS, DOCUMENTO_PLANO_PH, EXTENSIONES_PERMITIDAS, MAX_MB, PRECISIONES_ANIO, PROVINCIAS, SECCIONES,
  TIPOS_PROPIEDAD, NOMBRE_DOCUMENTO, aEdificacionApi, actualizarEdificacion, crearEdificacion, desdeApi, edificioVacio, enlaceDocumento,
  eliminarDocumento, formatoTamano, listarDocumentos, obtenerEdificacion, problemaArchivo, subirDocumento, ubicarDireccion, validarEdificio,
  type ArchivoAdjunto, type CampoEdificio, type DocumentoGuardado, type EdificioForm, type TipoDocumento, type Ubicacion,
} from './edificioForm';

interface NewBuildingProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCancel: () => void;
  /** Proyecto ya elegido (si se llega desde un proyecto) */
  proyectoInicial?: string | null;
  /** Se llama con el id del edificio creado (o editado), para abrirlo */
  onCreado: (id: string) => void;
  /** Si viene, el formulario edita ese edificio en vez de crear uno */
  edificioId?: string | null;
  /** Barra lateral: abrir un edificio de la lista */
  onAbrirEdificio: (id: string) => void;
  /** Barra lateral: botón «+ Nuevo» */
  onNuevoEdificio: () => void;
}

const ICONOS_TIPO: Record<string, React.ReactNode> = {
  casa: <Home className="w-3.5 h-3.5" />,
  edificio: <Building2 className="w-3.5 h-3.5" />,
  ph: <Layers className="w-3.5 h-3.5" />,
};

type EstadoUbicacion =
  | { estado: 'vacio' }
  | { estado: 'buscando' }
  | { estado: 'ok'; ubicacion: Ubicacion }
  | { estado: 'error'; motivo: string };

/** Campos opcionales que van plegados dentro de una sección obligatoria. */
const EXTRA_UBICACION: CampoEdificio[] = ['codigoPostal'];
const EXTRA_INMUEBLE: CampoEdificio[] = ['subsuelos', 'superficieCubierta', 'superficieTerreno', 'modificaciones'];

export default function NewBuilding({ activeTab, onTabChange, onCancel, proyectoInicial, onCreado, edificioId, onAbrirEdificio, onNuevoEdificio }: NewBuildingProps) {
  const editando = !!edificioId;
  const { proyectos, recargar } = useProyectos();
  const [f, setF] = useState<EdificioForm>(() => edificioVacio(proyectoInicial ?? ''));
  const [tocados, setTocados] = useState<Set<CampoEdificio>>(new Set());
  const [intento, setIntento] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [ubicacion, setUbicacion] = useState<EstadoUbicacion>({ estado: 'vacio' });
  const [archivos, setArchivos] = useState<ArchivoAdjunto[]>([]);
  const [avisoArchivos, setAvisoArchivos] = useState<string | null>(null);
  const [dialogoProyecto, setDialogoProyecto] = useState(false);
  const [guardado, setGuardado] = useState<{ id: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  // Edición: datos guardados que se cargan al abrir
  const [cargando, setCargando] = useState(editando);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [docsGuardados, setDocsGuardados] = useState<DocumentoGuardado[]>([]);
  const ubicacionGuardada = useRef<Ubicacion | null>(null);
  const [docABorrar, setDocABorrar] = useState<{ doc: DocumentoGuardado; enviando: boolean; error: string | null } | null>(null);

  useEffect(() => {
    if (!edificioId) return;
    let vivo = true;
    Promise.all([obtenerEdificacion(edificioId), listarDocumentos(edificioId).catch(() => [])])
      .then(([e, docs]) => {
        if (!vivo) return;
        const { form, ubicacion: u } = desdeApi(e);
        inicial.current = JSON.stringify(form);
        setF(form);
        ubicacionGuardada.current = u;
        if (u) setUbicacion({ estado: 'ok', ubicacion: u });
        setDocsGuardados(docs);
        // Se abren las solapas que ya tienen datos
        const abrir = new Set<string>();
        if (form.codigoPostal) abrir.add('mas-ubicacion');
        if (form.subsuelos || form.superficieCubierta || form.superficieTerreno || form.modificaciones) abrir.add('mas-inmueble');
        if (form.matricula || form.nomenclatura || form.partida || form.valuacion || form.linderos) abrir.add('registral');
        if (form.phUnidades || form.phUnidadFuncional || form.phPorcentual) abrir.add('ph');
        if (form.responsable || form.contacto) abrir.add('contacto');
        if (docs.length) abrir.add('documentos');
        setAbiertas(abrir);
      })
      .catch(() => vivo && setErrorCarga('No se pudieron cargar los datos del edificio. Revisá tu conexión.'))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [edificioId]);

  // Cambios sin guardar: se compara con cómo estaba el formulario al abrirlo (o al cargarlo)
  const inicial = useRef<string>(JSON.stringify(f));
  const sinGuardar = useRef(false);
  sinGuardar.current = !guardado && (JSON.stringify(f) !== inicial.current || archivos.some(a => a.estado !== 'ok'));
  useEffect(() => {
    registrarCambiosSinGuardar(() => sinGuardar.current);
    return () => registrarCambiosSinGuardar(null);
  }, []);

  // Si solo hay un proyecto, se elige solo
  useEffect(() => {
    if (!f.proyectoId && proyectos.length === 1) {
      const conProyecto = { ...f, proyectoId: proyectos[0].id };
      if (JSON.stringify(f) === inicial.current) inicial.current = JSON.stringify(conProyecto);
      setF(conProyecto);
    }
  }, [proyectos]); // eslint-disable-line react-hooks/exhaustive-deps

  const nombresEnProyecto = useMemo(
    () => (proyectos.find(p => p.id === f.proyectoId)?.buildings ?? [])
      .filter(b => b.id !== edificioId)
      .map(b => b.name.trim().toLowerCase()),
    [proyectos, f.proyectoId, edificioId],
  );
  const errores = useMemo(() => validarEdificio(f, nombresEnProyecto), [f, nombresEnProyecto]);
  const visibles = useMemo(() => {
    const v: Partial<Record<CampoEdificio, string>> = {};
    for (const [c, m] of Object.entries(errores) as [CampoEdificio, string][]) {
      if (intento || tocados.has(c) || (c === 'nombre' && m.startsWith('Ya hay'))) v[c] = m;
    }
    return v;
  }, [errores, tocados, intento]);
  const valido = Object.keys(errores).length === 0;
  const esPh = f.tipoPropiedad === 'ph';
  const secciones = SECCIONES.filter(s => !s.soloPh || esPh);

  function cambiar(c: Partial<EdificioForm>) {
    setF(x => ({ ...x, ...c }));
  }
  const tocar = (c: CampoEdificio) => () => setTocados(t => (t.has(c) ? t : new Set(t).add(c)));
  const alternar = (id: string, abrir?: boolean) =>
    setAbiertas(a => {
      const n = new Set(a);
      if (abrir ?? !n.has(id)) n.add(id); else n.delete(id);
      return n;
    });

  // ── Coordenadas: se buscan solas cuando la dirección está completa ──
  useEffect(() => {
    if (cargando) return;
    if (!/\d/.test(f.calleNumero) || !f.localidad.trim() || !f.provincia) {
      setUbicacion({ estado: 'vacio' });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => buscarUbicacion(ctrl), 700);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [f.calleNumero, f.localidad, f.provincia, cargando]); // eslint-disable-line react-hooks/exhaustive-deps

  async function buscarUbicacion(ctrl = new AbortController()) {
    setUbicacion({ estado: 'buscando' });
    try {
      const r = await ubicarDireccion(f, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setUbicacion('motivo' in r ? { estado: 'error', motivo: r.motivo } : { estado: 'ok', ubicacion: r });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setUbicacion({ estado: 'error', motivo: 'No se pudo consultar el servicio de direcciones.' });
    }
  }

  // ── Documentos ──
  function agregarArchivos(tipo: TipoDocumento, lista: FileList | File[]) {
    const nuevos: ArchivoAdjunto[] = [];
    const problemas: string[] = [];
    for (const a of Array.from(lista)) {
      const p = problemaArchivo(a);
      if (p) problemas.push(p);
      else nuevos.push({ id: `${Date.now()}-${Math.random()}`, tipo, archivo: a, estado: 'pendiente', progreso: 0 });
    }
    setArchivos(x => [...x, ...nuevos]);
    setAvisoArchivos(problemas.length ? problemas.join(' ') : null);
  }
  const quitarArchivo = (id: string) => setArchivos(x => x.filter(a => a.id !== id));

  async function confirmarQuitarDoc() {
    if (!docABorrar) return;
    setDocABorrar({ ...docABorrar, enviando: true, error: null });
    if (await eliminarDocumento(docABorrar.doc.id)) {
      setDocsGuardados(x => x.filter(d => d.id !== docABorrar.doc.id));
      setDocABorrar(null);
    } else {
      setDocABorrar({ ...docABorrar, enviando: false, error: 'No se pudo quitar el documento. Revisá tu conexión e intentá de nuevo.' });
    }
  }
  const pedirQuitarDoc = (doc: DocumentoGuardado) => setDocABorrar({ doc, enviando: false, error: null });

  async function subirPendientes(edificioId: string) {
    const lista = archivos.filter(a => esPh || a.tipo !== DOCUMENTO_PLANO_PH);
    for (const a of lista) {
      if (a.estado === 'ok') continue;
      setArchivos(x => x.map(y => (y.id === a.id ? { ...y, estado: 'subiendo', progreso: 0, error: undefined } : y)));
      try {
        await subirDocumento(edificioId, a, pct => setArchivos(x => x.map(y => (y.id === a.id ? { ...y, progreso: pct } : y))));
        setArchivos(x => x.map(y => (y.id === a.id ? { ...y, estado: 'ok', progreso: 100 } : y)));
      } catch (e) {
        setArchivos(x => x.map(y => (y.id === a.id ? { ...y, estado: 'error', error: (e as Error).message } : y)));
      }
    }
  }

  // ── Estado de cada paso (para la barra de progreso) ──
  const tieneDatos = (id: string, campos: CampoEdificio[]) =>
    id === 'documentos' ? archivos.some(a => a.tipo !== DOCUMENTO_PLANO_PH) || docsGuardados.some(d => d.tipo_archivo !== DOCUMENTO_PLANO_PH)
      : campos.some(c => String(f[c]).trim() !== '') || (id === 'ph' && archivos.some(a => a.tipo === DOCUMENTO_PLANO_PH));
  const pasos = secciones.map(s => {
    const conError = s.campos.some(c => visibles[c]);
    const listo = !s.campos.some(c => errores[c]) && (s.obligatoria || tieneDatos(s.id, s.campos));
    return { ...s, conError, listo };
  });

  function irA(id: string) {
    const s = secciones.find(x => x.id === id);
    if (s && !s.obligatoria) alternar(id, true);
    if (id === 'ubicacion' && EXTRA_UBICACION.some(c => errores[c])) alternar('mas-ubicacion', true);
    if (id === 'edificio' && EXTRA_INMUEBLE.some(c => errores[c])) alternar('mas-inmueble', true);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  // ── Guardar ──
  async function guardar() {
    setIntento(true);
    setErrorGuardar(null);
    if (!valido) {
      const primera = secciones.find(s => s.campos.some(c => errores[c]));
      if (primera) irA(primera.id);
      return;
    }
    if (guardando) return;
    setGuardando(true);
    try {
      let id = guardado?.id;
      if (!id) {
        // Si Georef no responde al editar, se conservan las coordenadas que ya estaban guardadas
        const coords = ubicacion.estado === 'ok' ? ubicacion.ubicacion : editando ? ubicacionGuardada.current : null;
        const cuerpo = aEdificacionApi(f, coords);
        if (edificioId) {
          await actualizarEdificacion(edificioId, cuerpo);
          id = edificioId;
        } else {
          ({ id } = await crearEdificacion(cuerpo));
        }
        setGuardado({ id });
      }
      await subirPendientes(id);
      await recargar();
    } catch (err) {
      if ((err as Error).message === '400') {
        // La nube lo rechazó por nombre repetido en el proyecto (por ejemplo, creado desde otra ventana)
        await recargar().catch(() => {});
        setErrorGuardar('Ya hay otra edificación con ese nombre en este proyecto (puede haberse creado desde otra ventana). Elegí otro nombre.');
        irA('identificacion');
      } else {
        setErrorGuardar(editando ? 'No se pudieron guardar los cambios. Revisá tu conexión e intentá de nuevo.' : 'No se pudo guardar el edificio. Revisá tu conexión e intentá de nuevo.');
      }
    } finally {
      setGuardando(false);
    }
  }

  const fallidos = archivos.filter(a => a.estado === 'error').length;
  // Guardado y todos los archivos arriba: se abre el edificio
  useEffect(() => {
    if (guardado && !guardando && fallidos === 0) onCreado(guardado.id);
  }, [guardado, guardando, fallidos]); // eslint-disable-line react-hooks/exhaustive-deps

  const sinProyectos = proyectos.length === 0;
  const zona = (tipo: TipoDocumento, etiqueta: string, ayuda: string) => (
    <ZonaDocumentos key={tipo} tipo={tipo} etiqueta={etiqueta} ayuda={ayuda}
      archivos={archivos.filter(a => a.tipo === tipo)} onAgregar={agregarArchivos} onQuitar={quitarArchivo} bloqueado={guardando} />
  );

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={t => salirSiSePuede(() => onTabChange(t))} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />

        <div className="flex flex-1 overflow-hidden">
        <ProjectsSidebar
          selectedBuildingId={edificioId ?? null}
          onSelectBuilding={id => salirSiSePuede(() => onAbrirEdificio(id))}
          borrador={editando ? undefined : { tipo: 'edificio', nombre: f.nombre, proyectoId: f.proyectoId }}
        />
        <div className="flex-1 overflow-y-auto bg-[#F3F6F9]">
          <div className="w-full max-w-[1600px] mx-auto px-6 xl:px-8 pt-8 pb-10">

            <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight">{editando ? `Editar ${f.nombre || 'edificio'}` : 'Nuevo edificio'}</h1>
            {cargando && <p className="mt-6 flex items-center gap-2 text-[14px] text-[#8A8C8E]"><Loader2 className="w-4 h-4 animate-spin" /> Cargando los datos del edificio…</p>}
            {errorCarga && <p className="mt-6 text-[14px] text-[#991B1B]">{errorCarga}</p>}
            {!cargando && !errorCarga && (<>

            {/* Barra de progreso */}
            <div className="sticky top-0 z-10 -mx-8 px-8 pt-5 pb-4 bg-[#F3F6F9]/95 backdrop-blur-sm">
              <Progreso pasos={pasos} onIr={irA} />
            </div>

            {/* Una sola tarjeta con todas las secciones */}
            <div className="mt-2 bg-white rounded-lg border border-[#14202B]/[0.07] shadow-[0_1px_2px_rgba(20,32,43,0.04),0_8px_24px_rgba(20,32,43,0.05)]">

              <Bloque id="identificacion" titulo="Identificación" descripcion="Cómo vas a reconocer el inmueble y a qué proyecto pertenece.">
                <div className="grid grid-cols-2 gap-4">
                  <Campo etiqueta="Nombre de referencia" obligatorio error={visibles.nombre} className="col-span-2">
                    <Entrada valor={f.nombre} onCambio={v => cambiar({ nombre: v })} onSalir={tocar('nombre')} placeholder="Ej. Edificio Corrientes 1234" error={visibles.nombre} />
                  </Campo>
                  <Campo etiqueta="Tipo de propiedad" obligatorio error={visibles.tipoPropiedad}>
                    <Segmentado valor={f.tipoPropiedad} onCambio={v => { cambiar({ tipoPropiedad: v }); tocar('tipoPropiedad')(); }}
                      opciones={TIPOS_PROPIEDAD.map(t => ({ ...t, icono: ICONOS_TIPO[t.valor] }))} error={visibles.tipoPropiedad} />
                  </Campo>
                  <Campo etiqueta="Proyecto" obligatorio error={visibles.proyectoId}
                    ayuda={editando ? 'No se puede cambiar después de creado.' : sinProyectos ? 'Todavía no tenés proyectos: creá uno con el botón de al lado.' : undefined}>
                    {editando ? (
                      <Entrada valor={proyectos.find(p => p.id === f.proyectoId)?.name ?? ''} onCambio={() => {}} deshabilitado />
                    ) : (
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <Selector valor={f.proyectoId} onCambio={v => cambiar({ proyectoId: v })} onSalir={tocar('proyectoId')}
                          opciones={proyectos.map(p => ({ valor: p.id, etiqueta: p.name }))}
                          placeholder={sinProyectos ? 'Sin proyectos' : 'Seleccionar proyecto'} error={visibles.proyectoId} />
                      </div>
                      <button type="button" onClick={() => setDialogoProyecto(true)} title="Crear un proyecto nuevo"
                        className="flex-none flex items-center justify-center gap-2 h-[42px] px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6]">
                        <Plus className="w-3.5 h-3.5" /> Nuevo
                      </button>
                    </div>
                    )}
                  </Campo>
                  <Campo etiqueta="Destino o uso" obligatorio error={visibles.destino} className="col-span-2">
                    <Segmentado valor={f.destino} onCambio={v => { cambiar({ destino: v }); tocar('destino')(); }} opciones={DESTINOS} error={visibles.destino} />
                  </Campo>
                </div>
              </Bloque>

              <Bloque id="ubicacion" titulo="Ubicación" descripcion="Dirección del inmueble. Las coordenadas se completan solas.">
                <div className="grid grid-cols-3 gap-4">
                  <Campo etiqueta="Calle y número" obligatorio error={visibles.calleNumero} className="col-span-3">
                    <Entrada valor={f.calleNumero} onCambio={v => cambiar({ calleNumero: v })} onSalir={tocar('calleNumero')} placeholder="Ej. Av. Corrientes 1234" error={visibles.calleNumero} />
                  </Campo>
                  <Campo etiqueta="Localidad" obligatorio error={visibles.localidad}>
                    <Entrada valor={f.localidad} onCambio={v => cambiar({ localidad: v })} onSalir={tocar('localidad')} placeholder="Ej. San Nicolás" error={visibles.localidad} />
                  </Campo>
                  <Campo etiqueta="Provincia" obligatorio error={visibles.provincia}>
                    <Selector valor={f.provincia} onCambio={v => cambiar({ provincia: v })} onSalir={tocar('provincia')}
                      opciones={PROVINCIAS.map(p => ({ valor: p, etiqueta: p }))} error={visibles.provincia} />
                  </Campo>
                  <Campo etiqueta="País" obligatorio error={visibles.pais}>
                    <Entrada valor={f.pais} onCambio={v => cambiar({ pais: v })} onSalir={tocar('pais')} error={visibles.pais} />
                  </Campo>
                </div>
                <Coordenadas estado={ubicacion} onReintentar={() => buscarUbicacion()} />
                <MasDatos id="mas-ubicacion" abierta={abiertas.has('mas-ubicacion')} onAlternar={() => alternar('mas-ubicacion')}
                  titulo="Código postal" cargados={EXTRA_UBICACION.filter(c => String(f[c]).trim()).length}>
                  <div className="grid grid-cols-3 gap-4">
                    <Campo etiqueta="Código postal" error={visibles.codigoPostal}>
                      <Entrada valor={f.codigoPostal} onCambio={v => cambiar({ codigoPostal: v })} onSalir={tocar('codigoPostal')} placeholder="C1043AAQ" error={visibles.codigoPostal} />
                    </Campo>
                  </div>
                </MasDatos>
              </Bloque>

              <Bloque id="edificio" titulo="Datos del inmueble" descripcion="Antigüedad y altura.">
                <div className="grid grid-cols-3 gap-4">
                  <Campo etiqueta="Año de construcción" obligatorio error={visibles.anio} className="col-span-2"
                    ayuda={f.anioPrecision === 'desconocido' ? 'Se guarda como desconocido.' : undefined}>
                    <div className="flex gap-2">
                      <div className="w-[110px] flex-none">
                        <Entrada valor={f.anioPrecision === 'desconocido' ? '' : f.anio} onCambio={v => cambiar({ anio: v })} onSalir={tocar('anio')}
                          placeholder={f.anioPrecision === 'desconocido' ? '—' : '1978'} modo="numeric" error={visibles.anio} deshabilitado={f.anioPrecision === 'desconocido'} />
                      </div>
                      <div className="flex-1">
                        <Segmentado valor={f.anioPrecision} onCambio={v => cambiar({ anioPrecision: v })} opciones={PRECISIONES_ANIO} />
                      </div>
                    </div>
                  </Campo>
                  <Campo etiqueta="Pisos sobre planta baja" obligatorio error={visibles.pisos} ayuda="0 si solo tiene planta baja.">
                    <Entrada valor={f.pisos} onCambio={v => cambiar({ pisos: v })} onSalir={tocar('pisos')} placeholder="8" modo="numeric" error={visibles.pisos} />
                  </Campo>
                </div>
                <MasDatos id="mas-inmueble" abierta={abiertas.has('mas-inmueble')} onAlternar={() => alternar('mas-inmueble')}
                  titulo="Subsuelos, superficies y modificaciones" cargados={EXTRA_INMUEBLE.filter(c => String(f[c]).trim()).length}>
                  <div className="grid grid-cols-3 gap-4">
                    <Campo etiqueta="Subsuelos" error={visibles.subsuelos}>
                      <Entrada valor={f.subsuelos} onCambio={v => cambiar({ subsuelos: v })} onSalir={tocar('subsuelos')} placeholder="0" modo="numeric" error={visibles.subsuelos} />
                    </Campo>
                    <Campo etiqueta="Superficie cubierta" error={visibles.superficieCubierta}>
                      <Entrada valor={f.superficieCubierta} onCambio={v => cambiar({ superficieCubierta: v })} onSalir={tocar('superficieCubierta')} placeholder="1250" modo="decimal" sufijo="m²" error={visibles.superficieCubierta} />
                    </Campo>
                    <Campo etiqueta="Superficie del terreno" error={visibles.superficieTerreno}>
                      <Entrada valor={f.superficieTerreno} onCambio={v => cambiar({ superficieTerreno: v })} onSalir={tocar('superficieTerreno')} placeholder="430" modo="decimal" sufijo="m²" error={visibles.superficieTerreno} />
                    </Campo>
                    <Campo etiqueta="Modificaciones o ampliaciones no originales" className="col-span-3"
                      ayuda="Por ejemplo: losa agregada en 2005, muro retirado en planta baja.">
                      <AreaTexto valor={f.modificaciones} onCambio={v => cambiar({ modificaciones: v })} placeholder="Describí qué se modificó y, si lo sabés, cuándo." filas={2} />
                    </Campo>
                  </div>
                </MasDatos>
              </Bloque>

              <Solapa id="registral" titulo="Datos registrales y catastrales"
                descripcion="Matrícula, nomenclatura, partida, valuación y linderos (de la escritura o la boleta de impuesto)."
                abierta={abiertas.has('registral')} onAlternar={() => alternar('registral')}
                cargados={['matricula', 'nomenclatura', 'partida', 'valuacion', 'linderos'].filter(c => String(f[c as CampoEdificio]).trim()).length}>
                <div className="grid grid-cols-3 gap-4">
                  <Campo etiqueta="Matrícula"><Entrada valor={f.matricula} onCambio={v => cambiar({ matricula: v })} placeholder="Ej. 20-12345" /></Campo>
                  <Campo etiqueta="Nomenclatura catastral"><Entrada valor={f.nomenclatura} onCambio={v => cambiar({ nomenclatura: v })} placeholder="Circ. · Secc. · Manz. · Parc." /></Campo>
                  <Campo etiqueta="Partida inmobiliaria"><Entrada valor={f.partida} onCambio={v => cambiar({ partida: v })} placeholder="Ej. 1234567" /></Campo>
                  <Campo etiqueta="Valuación fiscal" error={visibles.valuacion}>
                    <Entrada valor={f.valuacion} onCambio={v => cambiar({ valuacion: v })} onSalir={tocar('valuacion')} placeholder="12.500.000" modo="decimal" sufijo="$" error={visibles.valuacion} />
                  </Campo>
                  <Campo etiqueta="Linderos" className="col-span-2">
                    <Entrada valor={f.linderos} onCambio={v => cambiar({ linderos: v })} placeholder="Ej. NE: Parcela 12 · SO: Av. Corrientes" />
                  </Campo>
                </div>
              </Solapa>

              {esPh && (
                <Solapa id="ph" titulo="Propiedad horizontal" descripcion="Unidades, porcentual y plano de PH."
                  abierta={abiertas.has('ph')} onAlternar={() => alternar('ph')}
                  cargados={['phUnidades', 'phUnidadFuncional', 'phPorcentual'].filter(c => String(f[c as CampoEdificio]).trim()).length + archivos.filter(a => a.tipo === DOCUMENTO_PLANO_PH).length}>
                  <div className="grid grid-cols-3 gap-4">
                    <Campo etiqueta="Unidades funcionales" error={visibles.phUnidades} ayuda="Total del edificio.">
                      <Entrada valor={f.phUnidades} onCambio={v => cambiar({ phUnidades: v })} onSalir={tocar('phUnidades')} placeholder="24" modo="numeric" error={visibles.phUnidades} />
                    </Campo>
                    <Campo etiqueta="Unidad funcional y complementaria">
                      <Entrada valor={f.phUnidadFuncional} onCambio={v => cambiar({ phUnidadFuncional: v })} placeholder="Ej. UF 7 · UC 3" />
                    </Campo>
                    <Campo etiqueta="Porcentual" error={visibles.phPorcentual}>
                      <Entrada valor={f.phPorcentual} onCambio={v => cambiar({ phPorcentual: v })} onSalir={tocar('phPorcentual')} placeholder="4,15" modo="decimal" sufijo="%" error={visibles.phPorcentual} />
                    </Campo>
                  </div>
                  <div className="mt-4">
                    <DocumentosGuardados docs={docsGuardados.filter(d => d.tipo_archivo === DOCUMENTO_PLANO_PH)} onQuitar={pedirQuitarDoc} />
                    {zona(DOCUMENTO_PLANO_PH, 'Plano de PH', 'Plano de mensura y división en PH.')}
                  </div>
                </Solapa>
              )}

              <Solapa id="contacto" titulo="Responsable y contacto" descripcion="A quién avisar para coordinar el relevamiento."
                abierta={abiertas.has('contacto')} onAlternar={() => alternar('contacto')}
                cargados={['responsable', 'contacto'].filter(c => String(f[c as CampoEdificio]).trim()).length}>
                <div className="grid grid-cols-2 gap-4">
                  <Campo etiqueta="Propietario o administrador"><Entrada valor={f.responsable} onCambio={v => cambiar({ responsable: v })} placeholder="Ej. Administración Pérez" /></Campo>
                  <Campo etiqueta="Teléfono o email" error={visibles.contacto}>
                    <Entrada valor={f.contacto} onCambio={v => cambiar({ contacto: v })} onSalir={tocar('contacto')} placeholder="11 4321-5678 o nombre@mail.com" error={visibles.contacto} />
                  </Campo>
                </div>
              </Solapa>

              <Solapa id="documentos" titulo="Documentación adjunta"
                descripcion={`Planos, final de obra, escritura, fotos e informes. PDF, DWG, DXF, JPG, PNG o Word, hasta ${MAX_MB} MB.`}
                abierta={abiertas.has('documentos')} onAlternar={() => alternar('documentos')}
                cargados={archivos.filter(a => a.tipo !== DOCUMENTO_PLANO_PH).length + docsGuardados.filter(d => d.tipo_archivo !== DOCUMENTO_PLANO_PH).length}>
                <DocumentosGuardados docs={docsGuardados.filter(d => d.tipo_archivo !== DOCUMENTO_PLANO_PH)} onQuitar={pedirQuitarDoc} />
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {DOCUMENTOS.map(d => zona(d.valor, d.etiqueta, d.ayuda))}
                </div>
                {avisoArchivos && (
                  <p className="flex items-start gap-1.5 mt-3 text-[12px] font-medium text-[#991B1B]">
                    <CircleAlert className="w-3.5 h-3.5 flex-none mt-px" /> {avisoArchivos}
                  </p>
                )}
              </Solapa>

              {/* Pie con los botones */}
              <div className="sticky bottom-0 rounded-b-2xl bg-white/95 backdrop-blur-sm border-t border-[#14202B]/[0.06] px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0 text-[13px]">
                  {errorGuardar ? <span className="text-[#991B1B] font-medium">{errorGuardar}</span>
                    : fallidos > 0 && guardado ? <span className="text-[#991B1B] font-medium">El edificio se guardó, pero {fallidos} archivo{fallidos === 1 ? '' : 's'} no se pudo subir. Reintentá o seguí sin {fallidos === 1 ? 'él' : 'ellos'}.</span>
                    : intento && !valido ? <span className="text-[#991B1B] font-medium">Revisá los campos marcados en rojo.</span>
                    : guardando ? <span className="text-[#66686A]">{guardado ? 'Subiendo documentos…' : 'Guardando el edificio…'}</span>
                    : <span className="text-[#8A8C8E]">Los documentos se suben al guardar.</span>}
                </div>
                {fallidos > 0 && guardado && !guardando && <SecondaryButton onClick={() => onCreado(guardado.id)}>Seguir sin ellos</SecondaryButton>}
                {!guardado && <SecondaryButton onClick={() => salirSiSePuede(onCancel)}>Cancelar</SecondaryButton>}
                <PrimaryButton onClick={guardar} disabled={guardando} shadow
                  icon={guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : fallidos > 0 && guardado ? <RefreshCw className="w-4 h-4" /> : undefined}>
                  {guardando ? 'Guardando…' : fallidos > 0 && guardado ? 'Reintentar archivos' : editando ? 'Guardar cambios' : 'Guardar edificio'}
                </PrimaryButton>
              </div>
            </div>
            </>)}

          </div>
        </div>
        </div>
      </div>

      {docABorrar && (
        <DialogoConfirmar
          titulo="¿Quitar este documento?"
          textoBoton="Quitar"
          enviando={docABorrar.enviando}
          error={docABorrar.error}
          onConfirmar={confirmarQuitarDoc}
          onCerrar={() => setDocABorrar(null)}
        >
          «{docABorrar.doc.descripcion ?? 'Documento'}» deja de estar adjunto a esta edificación. No se puede deshacer.
        </DialogoConfirmar>
      )}

      {dialogoProyecto && (
        <DialogoNuevoProyecto
          nombresExistentes={proyectos.map(p => p.name.trim().toLowerCase())}
          onCerrar={() => setDialogoProyecto(false)}
          onCreado={async id => {
            await recargar();
            cambiar({ proyectoId: id });
            setDialogoProyecto(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Barra de progreso con circulitos ────────────────────────────────────────

function Progreso({ pasos, onIr }: {
  pasos: { id: string; titulo: string; obligatoria?: boolean; listo: boolean; conError: boolean }[];
  onIr: (id: string) => void;
}) {
  return (
    <ol className="flex items-start">
      {pasos.map((p, i) => {
        const siguienteListo = i < pasos.length - 1 && p.listo && pasos[i + 1].listo;
        return (
          <li key={p.id} className="relative flex-1 flex flex-col items-center min-w-0">
            {i < pasos.length - 1 && (
              <span className={`absolute top-[13px] left-1/2 w-full h-[2px] ${p.listo ? (siguienteListo ? 'bg-[#377DC0]' : 'bg-gradient-to-r from-[#377DC0] to-[#D6E2EE]') : 'bg-[#D6E2EE]'}`} aria-hidden />
            )}
            <button type="button" onClick={() => onIr(p.id)} className="relative z-[1] flex flex-col items-center gap-1.5 group" title={`Ir a ${p.titulo}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-colors ${
                p.conError ? 'bg-[#FEF2F2] border-[#EF4444] text-[#991B1B]'
                  : p.listo ? 'bg-[#377DC0] border-[#377DC0] text-white'
                  : 'bg-white border-[#C9D6E3] text-[#8A8C8E] group-hover:border-[#377DC0]'
              }`}>
                {p.conError ? '!' : p.listo ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className={`text-[12px] font-semibold text-center leading-tight px-1 ${p.conError ? 'text-[#991B1B]' : p.listo ? 'text-[#1A1C1E]' : 'text-[#66686A]'}`}>
                {p.titulo}
              </span>
              {!p.obligatoria && <span className="text-[10px] font-medium text-[#A0A2A4] -mt-1">opcional</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Documentos que ya estaban guardados (al editar) ─────────────────────────

function DocumentosGuardados({ docs, onQuitar }: { docs: DocumentoGuardado[]; onQuitar: (d: DocumentoGuardado) => void }) {
  if (!docs.length) return null;
  return (
    <div className="mb-4">
      <p className="text-[13px] font-medium text-[#14202B] mb-1">Ya guardados</p>
      <ul className="divide-y divide-[#14202B]/[0.06]">
        {docs.map(d => (
          <li key={d.id} className="flex items-center gap-2.5 py-2">
            <FileText className="w-4 h-4 flex-none text-[#8A8C8E]" />
            <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-[#1A1C1E]">{d.descripcion ?? 'Documento'}</span>
            <span className="flex-none text-[12px] text-[#8A8C8E]">{NOMBRE_DOCUMENTO[d.tipo_archivo ?? ''] ?? 'Documento'}</span>
            <a href={enlaceDocumento(d)} download aria-label={`Descargar ${d.descripcion ?? 'documento'}`} title="Descargar"
              className="flex-none text-[#377DC0] hover:opacity-75"><Download className="w-4 h-4" /></a>
            <button type="button" onClick={() => onQuitar(d)} aria-label={`Quitar ${d.descripcion ?? 'documento'}`} title="Quitar"
              className="flex-none text-[#991B1B] hover:opacity-75"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Coordenadas ──────────────────────────────────────────────────────────────

function Coordenadas({ estado, onReintentar }: { estado: EstadoUbicacion; onReintentar: () => void }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-[12px]">
      <MapPin className={`w-3.5 h-3.5 flex-none ${estado.estado === 'ok' ? 'text-[#10B981]' : estado.estado === 'error' ? 'text-[#D97706]' : 'text-[#A0A2A4]'}`} />
      <span className="min-w-0 truncate text-[#66686A]">
        {estado.estado === 'ok'
          ? <><span className="font-semibold text-[#1A1C1E]">{estado.ubicacion.lat.toFixed(6)}, {estado.ubicacion.lon.toFixed(6)}</span> · {estado.ubicacion.direccionNormalizada ?? 'dirección encontrada'} · Georef</>
          : estado.estado === 'buscando' ? 'Buscando coordenadas…'
          : estado.estado === 'error' ? `${estado.motivo} Las coordenadas son opcionales.`
          : 'Las coordenadas se completan solas al escribir calle, número, localidad y provincia.'}
      </span>
      {estado.estado === 'buscando' && <Loader2 className="w-3.5 h-3.5 flex-none animate-spin text-[#377DC0]" />}
      {estado.estado === 'error' && (
        <button type="button" onClick={onReintentar} className="flex-none flex items-center gap-1 font-semibold text-[#377DC0] hover:opacity-70">
          <RefreshCw className="w-3 h-3" /> Reintentar
        </button>
      )}
    </div>
  );
}

// ─── Zona para adjuntar archivos de un tipo ──────────────────────────────────

function ZonaDocumentos({ tipo, etiqueta, ayuda, archivos, onAgregar, onQuitar, bloqueado }: {
  tipo: TipoDocumento;
  etiqueta: string;
  ayuda: string;
  archivos: ArchivoAdjunto[];
  onAgregar: (tipo: TipoDocumento, lista: FileList | File[]) => void;
  onQuitar: (id: string) => void;
  bloqueado: boolean;
}) {
  const [encima, setEncima] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); if (!bloqueado) setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={e => { e.preventDefault(); setEncima(false); if (!bloqueado) onAgregar(tipo, e.dataTransfer.files); }}
        onClick={() => !bloqueado && entrada.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && !bloqueado && entrada.current?.click()}
        className={`flex items-center gap-3 rounded-md border border-dashed px-3.5 py-3 cursor-pointer transition-colors ${
          encima ? 'border-[#377DC0] bg-[#E3EEF8]' : 'border-[#377DC0]/30 hover:border-[#377DC0] hover:bg-[#F8FAFC]'
        } ${bloqueado ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Upload className="w-4 h-4 flex-none text-[#377DC0]" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#1A1C1E] truncate">{etiqueta}</p>
          <p className="text-[11px] text-[#8A8C8E] truncate">{ayuda} Arrastrá o hacé clic.</p>
        </div>
        <input ref={entrada} type="file" multiple hidden accept={EXTENSIONES_PERMITIDAS.join(',')}
          onChange={e => { if (e.target.files) onAgregar(tipo, e.target.files); e.target.value = ''; }} />
      </div>
      {archivos.length > 0 && (
        <ul className="mt-1.5">
          {archivos.map(a => (
            <li key={a.id} className="flex items-center gap-2 px-1 py-1.5">
              <FileText className="w-3.5 h-3.5 flex-none text-[#8A8C8E]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[#1A1C1E] truncate">{a.archivo.name}</span>
                  <span className={`flex-none text-[11px] font-medium ${a.estado === 'error' ? 'text-[#991B1B]' : a.estado === 'ok' ? 'text-[#065F46]' : 'text-[#8A8C8E]'}`}>
                    {a.estado === 'ok' ? 'Subido' : a.estado === 'error' ? a.error ?? 'Error' : a.estado === 'subiendo' ? `${a.progreso}%` : formatoTamano(a.archivo.size)}
                  </span>
                </div>
                {a.estado === 'subiendo' && (
                  <div className="mt-1 h-1 rounded-full bg-[#E3EEF8] overflow-hidden">
                    <div className="h-full bg-[#377DC0] transition-all" style={{ width: `${a.progreso}%` }} />
                  </div>
                )}
              </div>
              {a.estado !== 'subiendo' && a.estado !== 'ok' && (
                <button type="button" onClick={() => onQuitar(a.id)} aria-label={`Quitar ${a.archivo.name}`} className="flex-none text-[#8A8C8E] hover:text-[#1A1C1E]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
