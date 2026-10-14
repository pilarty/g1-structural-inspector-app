import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useProyectos } from './proyectos';
import { useSesion } from './sesion';
import { puedeSalir, registrarCambiosSinGuardar } from './navegacion';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton, SecondaryButton, ProjectsSidebar } from './components';
import { Bloque, Solapa, Campo, Entrada, Selector, AreaTexto, Fecha, TarjetaFormulario } from './components/Formulario';
import {
  FINALIDADES, TIPOS_CLIENTE, actualizarProyecto, crearProyecto, desdeProyectoApi, obtenerProyecto, proyectoVacio, validarProyecto,
  type CampoProyecto, type ErroresProyecto, type ProyectoForm,
} from './proyectoForm';

interface NewProjectProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCancel: () => void;
  /** Se llama con el id del proyecto creado (para seguir cargando sus edificios) */
  onCreado: (id: string) => void;
  /** Barra lateral: abrir un edificio de la lista */
  onAbrirEdificio: (id: string) => void;
  /** Si viene, el formulario edita ese proyecto en vez de crear uno */
  proyectoId?: string | null;
}

const CLIENTE: CampoProyecto[] = ['clienteNombre', 'tipoCliente', 'cuit', 'telefono', 'email'];

export default function NewProject({ activeTab, onTabChange, onCancel, onCreado, onAbrirEdificio, proyectoId }: NewProjectProps) {
  const editando = !!proyectoId;
  const { proyectos, recargar } = useProyectos();
  const { usuario } = useSesion();
  const [f, setF] = useState<ProyectoForm>(() => proyectoVacio(usuario));
  const [tocados, setTocados] = useState<Set<CampoProyecto>>(new Set());
  const [intento, setIntento] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(editando);
  // Cambios sin guardar: se compara con cómo estaba el formulario al abrirlo (o al cargarlo)
  const inicial = useRef<string>(JSON.stringify(f));
  const sinGuardar = useRef(false);
  sinGuardar.current = !guardando && JSON.stringify(f) !== inicial.current;
  useEffect(() => {
    registrarCambiosSinGuardar(() => sinGuardar.current);
    return () => registrarCambiosSinGuardar(null);
  }, []);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Edición: se cargan los datos guardados
  useEffect(() => {
    if (!proyectoId) return;
    let vivo = true;
    obtenerProyecto(proyectoId)
      .then(p => {
        if (!vivo) return;
        const form = desdeProyectoApi(p);
        inicial.current = JSON.stringify(form);
        setF(form);
        if (CLIENTE.some(c => String(form[c]).trim())) setAbiertas(new Set(['cliente']));
      })
      .catch(() => vivo && setErrorCarga('No se pudieron cargar los datos del proyecto. Revisá tu conexión.'))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [proyectoId]);

  const errores = validarProyecto(f, proyectos.filter(p => p.id !== proyectoId).map(p => p.name.trim().toLowerCase()));
  const visibles: ErroresProyecto = {};
  for (const [c, m] of Object.entries(errores) as [CampoProyecto, string][]) {
    if (intento || tocados.has(c) || (c === 'nombre' && m.startsWith('Ya'))) visibles[c] = m;
  }
  const cambiar = (c: Partial<ProyectoForm>) => setF(x => ({ ...x, ...c }));
  const tocar = (c: CampoProyecto) => () => setTocados(t => (t.has(c) ? t : new Set(t).add(c)));
  const alternar = (id: string, abrir?: boolean) =>
    setAbiertas(a => {
      const n = new Set(a);
      if (abrir ?? !n.has(id)) n.add(id); else n.delete(id);
      return n;
    });
  const cargados = (campos: CampoProyecto[]) => campos.filter(c => String(f[c]).trim()).length;

  async function crear() {
    setIntento(true);
    // Abre lo que esté plegado y tenga errores
    if (CLIENTE.some(c => errores[c])) alternar('cliente', true);
    if (Object.keys(errores).length || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      if (proyectoId) {
        await actualizarProyecto(proyectoId, f);
        await recargar();
        onCreado(proyectoId);
      } else {
        const { id } = await crearProyecto(f);
        await recargar();
        onCreado(id);
      }
    } catch (e) {
      if ((e as Error).message === '400') {
        // La nube lo rechazó por nombre repetido (por ejemplo, creado desde otra ventana): se recarga la lista
        // para que el campo lo marque, y se explica qué pasó
        await recargar().catch(() => {});
        setError('Ya existe otro proyecto tuyo con ese nombre (puede haberse creado desde otra ventana). Elegí otro nombre.');
      } else {
        setError(editando ? 'No se pudieron guardar los cambios. Revisá tu conexión e intentá de nuevo.' : 'No se pudo crear el proyecto. Revisá tu conexión e intentá de nuevo.');
      }
      setGuardando(false);
    }
  }

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={t => puedeSalir() && onTabChange(t)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />

        <div className="flex flex-1 overflow-hidden">
        <ProjectsSidebar
          selectedBuildingId={null}
          onSelectBuilding={id => puedeSalir() && onAbrirEdificio(id)}
          borrador={editando ? undefined : { tipo: 'proyecto', nombre: f.nombre }}
        />
        <div className="flex-1 overflow-y-auto bg-[#F3F6F9]">
          <div className="w-full px-8 pt-8 pb-10">

            <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight">{editando ? `Editar ${f.nombre || 'proyecto'}` : 'Nuevo proyecto'}</h1>
            <p className="text-[14px] text-[#8A8C8E] mt-1 mb-6">
              
            </p>

            {cargando && <p className="flex items-center gap-2 text-[14px] text-[#8A8C8E]"><Loader2 className="w-4 h-4 animate-spin" /> Cargando los datos del proyecto…</p>}
            {errorCarga && <p className="text-[14px] text-[#991B1B]">{errorCarga}</p>}
            {!cargando && !errorCarga && (
            <TarjetaFormulario
              pie={
                <>
                  <div className="flex-1 min-w-0 text-[13px]">
                    {error ? <span className="text-[#991B1B] font-medium">{error}</span>
                      : intento && Object.keys(errores).length ? <span className="text-[#991B1B] font-medium">Revisá los campos marcados en rojo.</span>
                      : null}
                  </div>
                  <SecondaryButton onClick={() => puedeSalir() && onCancel()}>Cancelar</SecondaryButton>
                  <PrimaryButton onClick={crear} disabled={guardando} shadow icon={guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}>
                    {guardando ? (editando ? 'Guardando…' : 'Creando…') : editando ? 'Guardar cambios' : 'Crear proyecto'}
                  </PrimaryButton>
                </>
              }
            >
              <Bloque id="proyecto" titulo="Proyecto">
                <div className="grid grid-cols-3 gap-4">
                  <Campo etiqueta="Nombre del proyecto" obligatorio error={visibles.nombre} className="col-span-2">
                    <Entrada valor={f.nombre} onCambio={v => cambiar({ nombre: v })} onSalir={tocar('nombre')} placeholder="Ej. Consorcio Torres del Parque" error={visibles.nombre} />
                  </Campo>
                  <Campo etiqueta="Finalidad de la inspección" obligatorio error={visibles.finalidad}>
                    <Selector valor={f.finalidad} onCambio={v => cambiar({ finalidad: v })} onSalir={tocar('finalidad')} opciones={FINALIDADES} error={visibles.finalidad} />
                  </Campo>
                  <Campo etiqueta="Responsable del proyecto" obligatorio error={visibles.responsable}>
                    <Entrada valor={f.responsable} onCambio={v => cambiar({ responsable: v })} onSalir={tocar('responsable')} error={visibles.responsable} />
                  </Campo>
                  <Campo etiqueta="Fecha de inicio" obligatorio error={visibles.fechaInicio}>
                    <Fecha valor={f.fechaInicio} onCambio={v => { cambiar({ fechaInicio: v }); tocar('fechaInicio')(); }} error={visibles.fechaInicio} />
                  </Campo>
                  <Campo etiqueta="Fecha estimada de fin" error={visibles.fechaFin}>
                    <Fecha valor={f.fechaFin} min={f.fechaInicio} onCambio={v => { cambiar({ fechaFin: v }); tocar('fechaFin')(); }} error={visibles.fechaFin} />
                  </Campo>
                  <Campo etiqueta="Descripción" error={visibles.descripcion} className="col-span-3">
                    <AreaTexto valor={f.descripcion} onCambio={v => cambiar({ descripcion: v })} filas={3} />
                  </Campo>
                </div>
              </Bloque>

              <Solapa id="cliente" titulo="Cliente"
                abierta={abiertas.has('cliente')} onAlternar={() => alternar('cliente')} cargados={cargados(CLIENTE)}>
                <div className="grid grid-cols-3 gap-4">
                  <Campo etiqueta="Nombre o razón social" className="col-span-2">
                    <Entrada valor={f.clienteNombre} onCambio={v => cambiar({ clienteNombre: v })} placeholder="Ej. Consorcio Av. del Libertador 4500" />
                  </Campo>
                  <Campo etiqueta="Tipo de cliente">
                    <Selector valor={f.tipoCliente} onCambio={v => cambiar({ tipoCliente: v })} opciones={TIPOS_CLIENTE} />
                  </Campo>
                  <Campo etiqueta="CUIT" error={visibles.cuit} ayuda="Útil si después facturás o emitís informes formales.">
                    <Entrada valor={f.cuit} onCambio={v => cambiar({ cuit: v })} onSalir={tocar('cuit')} placeholder="30-71234567-1" error={visibles.cuit} />
                  </Campo>
                  <Campo etiqueta="Teléfono" error={visibles.telefono}>
                    <Entrada valor={f.telefono} onCambio={v => cambiar({ telefono: v })} onSalir={tocar('telefono')} placeholder="11 4321-5678" modo="tel" error={visibles.telefono} />
                  </Campo>
                  <Campo etiqueta="Email" error={visibles.email}>
                    <Entrada valor={f.email} onCambio={v => cambiar({ email: v })} onSalir={tocar('email')} placeholder="administracion@consorcio.com" modo="email" error={visibles.email} />
                  </Campo>
                </div>
              </Solapa>

            </TarjetaFormulario>
            )}

          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
