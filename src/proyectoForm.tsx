import { useState } from 'react';
import { Folder, Loader2, X } from 'lucide-react';
import { BACKEND_URL, useSesion } from './sesion';
import { Campo, Entrada, Selector } from './components/Formulario';
import { PanelTitle } from './components';
import type { ResultadoEliminar } from './edificioForm';

// ─── Proyecto: datos, validación y guardado ──────────────────────────────────

export const FINALIDADES = [
  { valor: 'tecnica_periodica', etiqueta: 'Inspección técnica periódica' },
  { valor: 'seguro', etiqueta: 'Seguro' },
  { valor: 'tasacion', etiqueta: 'Tasación' },
  { valor: 'mantenimiento', etiqueta: 'Mantenimiento' },
  { valor: 'alquiler', etiqueta: 'Entrada o salida de alquiler' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export const TIPOS_CLIENTE = [
  { valor: 'Propietario', etiqueta: 'Propietario' },
  { valor: 'Consorcio', etiqueta: 'Consorcio' },
  { valor: 'Administración', etiqueta: 'Administración' },
  { valor: 'Aseguradora', etiqueta: 'Aseguradora' },
  { valor: 'Otro', etiqueta: 'Otro' },
];

export type EstadoProyecto = 'activo' | 'pausa' | 'finalizado';
export const ESTADOS_PROYECTO: { valor: EstadoProyecto; etiqueta: string }[] = [
  { valor: 'activo', etiqueta: 'Activo' },
  { valor: 'pausa', etiqueta: 'En pausa' },
  { valor: 'finalizado', etiqueta: 'Finalizado' },
];

export interface ProyectoForm {
  // Proyecto
  nombre: string;
  finalidad: string;
  descripcion: string;
  responsable: string;
  estado: EstadoProyecto;
  fechaInicio: string;   // AAAA-MM-DD
  fechaFin: string;      // AAAA-MM-DD (opcional)
  // Cliente (todo opcional)
  clienteNombre: string;
  tipoCliente: string;
  cuit: string;
  telefono: string;
  email: string;
  // Profesional habilitado (opcional a nivel proyecto)
  profesional: string;
  matricula: string;
}

export type CampoProyecto = keyof ProyectoForm;
export type ErroresProyecto = Partial<Record<CampoProyecto, string>>;

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const proyectoVacio = (responsable = ''): ProyectoForm => ({
  nombre: '', finalidad: '', descripcion: '', responsable, estado: 'activo', fechaInicio: hoy(), fechaFin: '',
  clienteNombre: '', tipoCliente: '', cuit: '', telefono: '', email: '',
  profesional: '', matricula: '',
});

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** CUIT/CUIL: 11 dígitos con dígito verificador (acepta guiones). */
export function cuitValido(t: string): boolean {
  const d = t.replace(/[\s-]/g, '');
  if (!/^\d{11}$/.test(d)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((s, p, i) => s + p * Number(d[i]), 0);
  let verificador = 11 - (suma % 11);
  if (verificador === 11) verificador = 0;
  if (verificador === 10) verificador = 9;
  return verificador === Number(d[10]);
}

/** `nombresExistentes`: nombres de tus proyectos, en minúsculas. */
export function validarProyecto(f: ProyectoForm, nombresExistentes: string[]): ErroresProyecto {
  const e: ErroresProyecto = {};
  const n = f.nombre.trim();
  if (!n) e.nombre = 'Falta el nombre del proyecto.';
  else if (n.length > 120) e.nombre = 'Usá como máximo 120 caracteres.';
  else if (nombresExistentes.includes(n.toLowerCase())) e.nombre = 'Ya tenés un proyecto con ese nombre.';
  if (!f.finalidad) e.finalidad = 'Elegí la finalidad de la inspección.';
  if (!f.responsable.trim()) e.responsable = 'Falta el responsable del proyecto.';
  if (f.descripcion.length > 1000) e.descripcion = 'Usá como máximo 1000 caracteres.';
  if (!RE_FECHA.test(f.fechaInicio)) e.fechaInicio = 'Elegí la fecha de inicio.';
  if (f.fechaFin) {
    if (!RE_FECHA.test(f.fechaFin)) e.fechaFin = 'La fecha no es válida.';
    else if (RE_FECHA.test(f.fechaInicio) && f.fechaFin < f.fechaInicio) e.fechaFin = 'No puede ser anterior a la fecha de inicio.';
  }
  if (f.cuit.trim() && !cuitValido(f.cuit)) e.cuit = 'El CUIT no es válido. Son 11 números, por ejemplo 30-71234567-1.';
  if (f.telefono.trim()) {
    const dig = f.telefono.replace(/\D/g, '');
    if (!/^[\d\s+()-]+$/.test(f.telefono.trim()) || dig.length < 6 || dig.length > 15) e.telefono = 'Escribí un teléfono válido, por ejemplo 11 4321-5678.';
  }
  if (f.email.trim() && !RE_EMAIL.test(f.email.trim())) e.email = 'Escribí un email válido, por ejemplo nombre@dominio.com.';
  if (f.matricula.trim() && !f.profesional.trim()) e.profesional = 'Indicá a quién corresponde la matrícula.';
  return e;
}

const texto = (t: string) => t.trim() || null;

export function aProyectoApi(f: ProyectoForm) {
  return {
    nombre: f.nombre.trim(),
    finalidad: f.finalidad,
    descripcion: texto(f.descripcion),
    responsable: f.responsable.trim(),
    estado: f.estado,
    fecha_inicio: f.fechaInicio,
    fecha_fin_estimada: f.fechaFin || null,
    cliente_nombre: texto(f.clienteNombre),
    tipo_cliente: f.tipoCliente || null,
    cliente_cuit: f.cuit.trim() ? f.cuit.replace(/[\s-]/g, '') : null,
    cliente_telefono: texto(f.telefono),
    cliente_email: texto(f.email),
    profesional_nombre: texto(f.profesional),
    profesional_matricula: texto(f.matricula),
  };
}

export async function crearProyecto(f: ProyectoForm): Promise<{ id: string }> {
  const r = await fetch(`${BACKEND_URL}/nube/api/proyectos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aProyectoApi(f)),
  });
  if (!r.ok) throw new Error(String(r.status));
  const d = await r.json();
  return { id: String(d.id) };
}

/** Fila de `proyecto` tal como la devuelve la nube. */
export interface ProyectoApi {
  id: number;
  nombre: string;
  finalidad: string | null;
  descripcion: string | null;
  responsable: string | null;
  estado: string | null;
  fecha_inicio: string | null;
  fecha_fin_estimada: string | null;
  fecha_alta: string | null;
  cliente_nombre: string | null;
  tipo_cliente: string | null;
  cliente_cuit: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  profesional_nombre: string | null;
  profesional_matricula: string | null;
}

export async function obtenerProyecto(id: string): Promise<ProyectoApi> {
  const r = await fetch(`${BACKEND_URL}/nube/api/proyectos/${id}`);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/** CUIT guardado (solo números) → con guiones, como se muestra. */
const conGuiones = (c: string) => (/^\d{11}$/.test(c) ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : c);

export function desdeProyectoApi(p: ProyectoApi): ProyectoForm {
  const estado = (['activo', 'pausa', 'finalizado'] as const).find(e => e === p.estado) ?? 'activo';
  return {
    nombre: p.nombre ?? '', finalidad: p.finalidad ?? '', descripcion: p.descripcion ?? '', responsable: p.responsable ?? '',
    estado, fechaInicio: (p.fecha_inicio ?? p.fecha_alta ?? '').slice(0, 10), fechaFin: (p.fecha_fin_estimada ?? '').slice(0, 10),
    clienteNombre: p.cliente_nombre ?? '', tipoCliente: p.tipo_cliente ?? '', cuit: conGuiones(p.cliente_cuit ?? ''),
    telefono: p.cliente_telefono ?? '', email: p.cliente_email ?? '',
    profesional: p.profesional_nombre ?? '', matricula: p.profesional_matricula ?? '',
  };
}

export async function actualizarProyecto(id: string, f: ProyectoForm): Promise<void> {
  const r = await fetch(`${BACKEND_URL}/nube/api/proyectos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aProyectoApi(f)),
  });
  if (!r.ok) throw new Error(String(r.status));
}

/** Borra el proyecto y sus edificaciones. Si alguna tiene inspecciones, solo con `forzar` (las borra también). */
export async function eliminarProyecto(id: string, forzar = false): Promise<ResultadoEliminar> {
  try {
    const r = await fetch(`${BACKEND_URL}/nube/api/proyectos/${id}${forzar ? '?forzar=true' : ''}`, { method: 'DELETE' });
    if (r.status === 409) {
      const d = await r.json().catch(() => ({}));
      return { ok: false, motivo: 'en_uso', relevamientos: Number(d.relevamientos) || 0 };
    }
    return r.ok ? { ok: true } : { ok: false, motivo: 'red' };
  } catch {
    return { ok: false, motivo: 'red' };
  }
}

// ─── Diálogo para crear un proyecto sin salir de otra pantalla ──────────────

/** Pide solo lo obligatorio; el resto queda con sus valores por defecto y se completa después. */
export function DialogoNuevoProyecto({ nombresExistentes, onCreado, onCerrar }: {
  nombresExistentes: string[];
  onCreado: (id: string) => void;
  onCerrar: () => void;
}) {
  const { usuario } = useSesion();
  const [f, setF] = useState<ProyectoForm>(() => proyectoVacio(usuario));
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errores = validarProyecto(f, nombresExistentes);
  const visibles: ErroresProyecto = intento ? errores : errores.nombre?.startsWith('Ya') ? { nombre: errores.nombre } : {};
  const cambiar = (c: Partial<ProyectoForm>) => setF(x => ({ ...x, ...c }));

  async function crear() {
    setIntento(true);
    if (Object.keys(errores).length || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const { id } = await crearProyecto(f);
      onCreado(id);
    } catch {
      setError('No se pudo crear el proyecto. Revisá tu conexión e intentá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Nuevo proyecto">
      <div className="w-full max-w-[600px] bg-white rounded-lg shadow-[0_8px_48px_rgba(0,0,0,0.16)] overflow-hidden">
        <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-[#14202B]/[0.06]">
          <span className="flex-none w-8 h-8 rounded-lg bg-[#E3EEF8] text-[#377DC0] flex items-center justify-center"><Folder className="w-4 h-4" /></span>
          <div className="flex-1 min-w-0">
            <PanelTitle>Nuevo proyecto</PanelTitle>
            <p className="text-[12px] text-[#8A8C8E] mt-0.5">Lo esencial para empezar. El cliente y el resto podés completarlos después.</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-[#8A8C8E] hover:text-[#1A1C1E]"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <Campo etiqueta="Nombre del proyecto" obligatorio error={visibles.nombre} className="col-span-2">
            <Entrada valor={f.nombre} onCambio={v => cambiar({ nombre: v })} placeholder="Ej. Consorcio Torres del Parque" error={visibles.nombre} />
          </Campo>
          <Campo etiqueta="Finalidad de la inspección" obligatorio error={visibles.finalidad}>
            <Selector valor={f.finalidad} onCambio={v => cambiar({ finalidad: v })} opciones={FINALIDADES} error={visibles.finalidad} />
          </Campo>
          <Campo etiqueta="Responsable del proyecto" obligatorio error={visibles.responsable}>
            <Entrada valor={f.responsable} onCambio={v => cambiar({ responsable: v })} error={visibles.responsable} />
          </Campo>
          {error && <p className="col-span-2 text-[13px] text-[#991B1B]">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-5 px-6 py-4 bg-[#F8FAFC] border-t border-[#14202B]/[0.06]">
          <button type="button" onClick={onCerrar} className="text-[13px] font-medium text-[#8A8C8E] hover:text-[#1A1C1E]">Cancelar</button>
          <button type="button" onClick={crear} disabled={enviando}
            className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-[#377DC0] text-white hover:bg-[#2F6CA8] disabled:opacity-50">
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
            {enviando ? 'Creando…' : 'Crear proyecto'}
          </button>
        </div>
      </div>
    </div>
  );
}
