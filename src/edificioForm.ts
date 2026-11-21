import { BACKEND_URL } from './sesion';

// Ficha de un edificio o casa
// Campos según: Ley 17.801 (Registro de la Propiedad), Ley 26.209 (Catastro),
// Ley 257 CABA, Disposición 392/2006 DGFOC y la ficha de relevamiento edilicio.

export type TipoPropiedad = 'casa' | 'edificio' | 'ph';
export type Destino = 'vivienda' | 'comercial' | 'mixto' | 'oficinas';
export type PrecisionAnio = 'exacto' | 'aproximado' | 'desconocido';
export type TipoDocumento = 'plano_aprobado' | 'final_obra' | 'escritura' | 'foto' | 'informe_anterior' | 'plano_ph';

export const TIPOS_PROPIEDAD: { valor: TipoPropiedad; etiqueta: string }[] = [
  { valor: 'casa', etiqueta: 'Casa' },
  { valor: 'edificio', etiqueta: 'Edificio' },
  { valor: 'ph', etiqueta: 'PH' },
];

export const DESTINOS: { valor: Destino; etiqueta: string }[] = [
  { valor: 'vivienda', etiqueta: 'Vivienda' },
  { valor: 'comercial', etiqueta: 'Comercial' },
  { valor: 'mixto', etiqueta: 'Mixto' },
  { valor: 'oficinas', etiqueta: 'Oficinas' },
];

export const PRECISIONES_ANIO: { valor: PrecisionAnio; etiqueta: string }[] = [
  { valor: 'exacto', etiqueta: 'Exacto' },
  { valor: 'aproximado', etiqueta: 'Aproximado' },
  { valor: 'desconocido', etiqueta: 'Desconocido' },
];

/** Las 24 jurisdicciones, con el nombre que usa Georef. */
export const PROVINCIAS = [
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Ciudad Autónoma de Buenos Aires', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta',
  'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego, Antártida e Islas del Atlántico Sur', 'Tucumán',
];

export const DOCUMENTOS: { valor: TipoDocumento; etiqueta: string; ayuda: string }[] = [
  { valor: 'plano_aprobado', etiqueta: 'Planos aprobados', ayuda: 'Planos de obra registrados.' },
  { valor: 'final_obra', etiqueta: 'Final de obra', ayuda: 'Certificado de final de obra.' },
  { valor: 'escritura', etiqueta: 'Escritura o boleta de impuesto', ayuda: 'Para identificar la propiedad.' },
  { valor: 'foto', etiqueta: 'Fotos', ayuda: 'Fachada, accesos o daños visibles.' },
  { valor: 'informe_anterior', etiqueta: 'Informes de inspecciones anteriores', ayuda: 'Relevamientos o peritajes previos.' },
];
export const DOCUMENTO_PLANO_PH: TipoDocumento = 'plano_ph';

export const EXTENSIONES_PERMITIDAS = ['.pdf', '.dwg', '.dxf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
export const MAX_MB = 50;

export interface EdificioForm {
  // 1. Identificación
  nombre: string;
  tipoPropiedad: TipoPropiedad | '';
  proyectoId: string;
  destino: Destino | '';
  // 2. Ubicación
  calleNumero: string;
  localidad: string;
  provincia: string;
  pais: string;
  codigoPostal: string;
  // 3. Datos del edificio o la casa
  anioPrecision: PrecisionAnio;
  anio: string;
  pisos: string;
  subsuelos: string;
  superficieCubierta: string;
  superficieTerreno: string;
  modificaciones: string;
  // 4. Registrales y catastrales
  matricula: string;
  nomenclatura: string;
  partida: string;
  valuacion: string;
  linderos: string;
  // 5. Propiedad horizontal
  phUnidades: string;
  phUnidadFuncional: string;
  phPorcentual: string;
  // 6. Responsable y contacto
  responsable: string;
  contacto: string;
}

export type CampoEdificio = keyof EdificioForm;
export type ErroresEdificio = Partial<Record<CampoEdificio, string>>;

export function edificioVacio(proyectoId = ''): EdificioForm {
  return {
    nombre: '', tipoPropiedad: '', proyectoId, destino: '',
    calleNumero: '', localidad: '', provincia: '', pais: 'Argentina', codigoPostal: '',
    anioPrecision: 'exacto', anio: '', pisos: '', subsuelos: '', superficieCubierta: '', superficieTerreno: '', modificaciones: '',
    matricula: '', nomenclatura: '', partida: '', valuacion: '', linderos: '',
    phUnidades: '', phUnidadFuncional: '', phPorcentual: '',
    responsable: '', contacto: '',
  };
}

// Validaciones

const ANIO_ACTUAL = new Date().getFullYear();
const RE_CP = /^([A-Za-z]\d{4}[A-Za-z]{3}|\d{4})$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function entero(t: string): number | null {
  const s = t.trim().replace(/\./g, '');
  return /^\d+$/.test(s) ? Number(s) : null;
}

/** Acepta coma o punto decimal: "1.250,5" o "1250.5". */
export function decimal(t: string): number | null {
  let s = t.trim();
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, ''); // 12.500.000
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

function esTelefono(t: string) {
  const digitos = t.replace(/\D/g, '');
  return /^[\d\s+()-]+$/.test(t.trim()) && digitos.length >= 6 && digitos.length <= 15;
}

/** `nombresEnProyecto`: nombres de los otros edificios del proyecto elegido (en minúsculas). */
export function validarEdificio(f: EdificioForm, nombresEnProyecto: string[]): ErroresEdificio {
  const e: ErroresEdificio = {};
  const nombre = f.nombre.trim();
  if (!nombre) e.nombre = 'Falta el nombre de referencia.';
  else if (nombre.length > 120) e.nombre = 'Usá como máximo 120 caracteres.';
  else if (nombresEnProyecto.includes(nombre.toLowerCase())) e.nombre = 'Ya hay un edificio con ese nombre en este proyecto.';
  if (!f.tipoPropiedad) e.tipoPropiedad = 'Elegí el tipo de propiedad.';
  if (!f.proyectoId) e.proyectoId = 'Elegí el proyecto al que pertenece.';
  if (!f.destino) e.destino = 'Elegí el destino o uso.';

  if (!f.calleNumero.trim()) e.calleNumero = 'Falta la calle y el número.';
  else if (!/\d/.test(f.calleNumero)) e.calleNumero = 'Falta el número (altura) de la calle.';
  if (!f.localidad.trim()) e.localidad = 'Falta la localidad.';
  if (!f.provincia) e.provincia = 'Elegí la provincia.';
  if (!f.pais.trim()) e.pais = 'Falta el país.';
  if (f.codigoPostal.trim() && !RE_CP.test(f.codigoPostal.trim())) e.codigoPostal = 'Usá 4 números (1043) o el formato CPA (C1043AAQ).';

  if (f.anioPrecision !== 'desconocido') {
    const anio = entero(f.anio);
    if (!f.anio.trim()) e.anio = 'Falta el año. Si no lo sabés, elegí «Desconocido».';
    else if (anio === null || anio < 1800 || anio > ANIO_ACTUAL) e.anio = `Debe ser un año entre 1800 y ${ANIO_ACTUAL}.`;
  }
  const pisos = entero(f.pisos);
  if (!f.pisos.trim()) e.pisos = 'Falta la cantidad de pisos (0 si solo tiene planta baja).';
  else if (pisos === null || pisos > 200) e.pisos = 'Debe ser un número entero entre 0 y 200.';
  if (f.subsuelos.trim()) {
    const s = entero(f.subsuelos);
    if (s === null || s > 20) e.subsuelos = 'Debe ser un número entero entre 0 y 20.';
  }
  for (const c of ['superficieCubierta', 'superficieTerreno'] as const) {
    if (f[c].trim()) {
      const v = decimal(f[c]);
      if (v === null || v <= 0 || v > 10_000_000) e[c] = 'Debe ser un número mayor que 0, en m².';
    }
  }

  if (f.valuacion.trim()) {
    const v = decimal(f.valuacion);
    if (v === null) e.valuacion = 'Debe ser un importe, por ejemplo 12500000 o 12.500.000,50.';
  }

  if (f.tipoPropiedad === 'ph') {
    if (f.phUnidades.trim()) {
      const u = entero(f.phUnidades);
      if (u === null || u < 1 || u > 5000) e.phUnidades = 'Debe ser un número entero mayor que 0.';
    }
    if (f.phPorcentual.trim()) {
      const p = decimal(f.phPorcentual);
      if (p === null || p <= 0 || p > 100) e.phPorcentual = 'Debe ser un porcentaje entre 0 y 100.';
    }
  }

  const contacto = f.contacto.trim();
  if (contacto && !RE_EMAIL.test(contacto) && !esTelefono(contacto)) {
    e.contacto = 'Escribí un email (nombre@dominio.com) o un teléfono (11 4321-5678).';
  }
  return e;
}

/** Secciones y los campos de cada una (para el índice y para llevar al primer error). */
/** `obligatoria`: tiene campos obligatorios (las demás se marcan como opcionales en el índice). */
export const SECCIONES: { id: string; titulo: string; campos: CampoEdificio[]; obligatoria?: boolean; soloPh?: boolean }[] = [
  { id: 'identificacion', titulo: 'Identificación', campos: ['nombre', 'tipoPropiedad', 'proyectoId', 'destino'], obligatoria: true },
  { id: 'ubicacion', titulo: 'Ubicación', campos: ['calleNumero', 'localidad', 'provincia', 'pais', 'codigoPostal'], obligatoria: true },
  { id: 'edificio', titulo: 'Datos del inmueble', campos: ['anio', 'pisos', 'subsuelos', 'superficieCubierta', 'superficieTerreno', 'modificaciones'], obligatoria: true },
  { id: 'registral', titulo: 'Datos registrales', campos: ['matricula', 'nomenclatura', 'partida', 'valuacion', 'linderos'] },
  { id: 'ph', titulo: 'Propiedad horizontal', campos: ['phUnidades', 'phUnidadFuncional', 'phPorcentual'], soloPh: true },
  { id: 'contacto', titulo: 'Contacto', campos: ['responsable', 'contacto'] },
  { id: 'documentos', titulo: 'Documentación', campos: [] },
];

// Ubicación (Georef)

export interface Ubicacion { lat: number; lon: number; direccionNormalizada: string | null }

export async function ubicarDireccion(f: EdificioForm, signal?: AbortSignal): Promise<Ubicacion | { motivo: string }> {
  const q = new URLSearchParams({ calle: f.calleNumero.trim(), localidad: f.localidad.trim(), provincia: f.provincia });
  const r = await fetch(`${BACKEND_URL}/edificio/ubicar?${q}`, { signal });
  if (!r.ok) return { motivo: 'No se pudo consultar el servicio de direcciones.' };
  const d = await r.json();
  return d.encontrado ? { lat: d.lat, lon: d.lon, direccionNormalizada: d.direccion_normalizada } : { motivo: d.motivo };
}

// Guardado

const texto = (t: string) => t.trim() || null;

export function aEdificacionApi(f: EdificioForm, ubicacion: Ubicacion | null) {
  const pisos = entero(f.pisos) ?? 0;
  const ph = f.tipoPropiedad === 'ph';
  return {
    proyecto_id: Number(f.proyectoId),
    nombre: f.nombre.trim(),
    tipo_propiedad: f.tipoPropiedad,
    destino: f.destino,
    direccion: [f.calleNumero, f.localidad, f.provincia, f.pais].map(s => s.trim()).filter(Boolean).join(', '),
    calle_numero: f.calleNumero.trim(),
    localidad: f.localidad.trim(),
    provincia: f.provincia,
    pais: f.pais.trim(),
    codigo_postal: texto(f.codigoPostal.toUpperCase()),
    latitud: ubicacion?.lat ?? null,
    longitud: ubicacion?.lon ?? null,
    anio_construccion: f.anioPrecision === 'desconocido' ? null : entero(f.anio),
    anio_precision: f.anioPrecision,
    pisos_sobre_pb: pisos,
    cantidad_plantas: pisos + 1, // planta baja incluida (lo usa el resto de la app)
    subsuelos: entero(f.subsuelos),
    superficie_cubierta: decimal(f.superficieCubierta),
    superficie_terreno: decimal(f.superficieTerreno),
    modificaciones: texto(f.modificaciones),
    matricula: texto(f.matricula),
    nomenclatura_catastral: texto(f.nomenclatura),
    partida_inmobiliaria: texto(f.partida),
    valuacion_fiscal: decimal(f.valuacion),
    linderos: texto(f.linderos),
    ph_unidades_funcionales: ph ? entero(f.phUnidades) : null,
    ph_unidad_funcional: ph ? texto(f.phUnidadFuncional) : null,
    ph_porcentual: ph ? decimal(f.phPorcentual) : null,
    responsable: texto(f.responsable),
    contacto: texto(f.contacto),
  };
}

export async function crearEdificacion(cuerpo: ReturnType<typeof aEdificacionApi>): Promise<{ id: string }> {
  const r = await fetch(`${BACKEND_URL}/nube/api/edificaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(String(r.status));
  const d = await r.json();
  return { id: String(d.id) };
}

// Documentos

export interface ArchivoAdjunto {
  id: string;
  tipo: TipoDocumento;
  archivo: File;
  estado: 'pendiente' | 'subiendo' | 'ok' | 'error';
  progreso: number;
  error?: string;
}

/** Devuelve el motivo si el archivo no se puede adjuntar. */
export function problemaArchivo(a: File): string | null {
  const ext = a.name.includes('.') ? '.' + a.name.split('.').pop()!.toLowerCase() : '';
  if (!EXTENSIONES_PERMITIDAS.includes(ext)) return `«${a.name}» no es un formato permitido (PDF, DWG, DXF, JPG, PNG o Word).`;
  if (a.size > MAX_MB * 1024 * 1024) return `«${a.name}» pesa más de ${MAX_MB} MB.`;
  if (a.size === 0) return `«${a.name}» está vacío.`;
  return null;
}

/** Sube un archivo por el backend local (que lo pasa a S3) e informa el avance. */
export function subirDocumento(edificioId: string, a: ArchivoAdjunto, alAvanzar: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const q = new URLSearchParams({
      edificacion_id: edificioId, tipo: a.tipo, nombre: a.archivo.name,
      content_type: a.archivo.type || 'application/octet-stream',
    });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}/edificio/documentos?${q}`);
    xhr.upload.onprogress = e => e.lengthComputable && alAvanzar(Math.round((e.loaded / e.total) * 95));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.status === 413 ? 'Supera los 50 MB.' : 'No se pudo subir.')));
    xhr.onerror = () => reject(new Error('Sin conexión con el backend local.'));
    xhr.send(a.archivo);
  });
}

export const formatoTamano = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Lectura y edición de un edificio guardado

/** Fila de `edificacion` tal como la devuelve la nube. */
export interface EdificacionApi {
  id: number;
  proyecto_id: number;
  nombre: string | null;
  tipo_propiedad: string | null;
  destino: string | null;
  direccion: string | null;
  calle_numero: string | null;
  localidad: string | null;
  provincia: string | null;
  pais: string | null;
  codigo_postal: string | null;
  latitud: number | string | null;
  longitud: number | string | null;
  anio_construccion: number | null;
  anio_precision: string | null;
  pisos_sobre_pb: number | null;
  cantidad_plantas: number | null;
  subsuelos: number | null;
  superficie_cubierta: number | string | null;
  superficie_terreno: number | string | null;
  modificaciones: string | null;
  matricula: string | null;
  nomenclatura_catastral: string | null;
  partida_inmobiliaria: string | null;
  valuacion_fiscal: number | string | null;
  linderos: string | null;
  ph_unidades_funcionales: number | null;
  ph_unidad_funcional: string | null;
  ph_porcentual: number | string | null;
  responsable: string | null;
  contacto: string | null;
  fecha_alta: string | null;
}

export interface DocumentoGuardado {
  id: number;
  edificacion_id: number;
  archivo_url: string;
  tipo_archivo: string | null;
  descripcion: string | null;
  fecha_carga: string | null;
}

export async function obtenerEdificacion(id: string): Promise<EdificacionApi> {
  const r = await fetch(`${BACKEND_URL}/nube/api/edificaciones/${id}`);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export async function listarDocumentos(id: string): Promise<DocumentoGuardado[]> {
  const r = await fetch(`${BACKEND_URL}/nube/api/documentos`);
  if (!r.ok) throw new Error(String(r.status));
  const todos: DocumentoGuardado[] = await r.json();
  return todos.filter(d => String(d.edificacion_id) === id).sort((a, b) => a.id - b.id);
}

export async function actualizarEdificacion(id: string, cuerpo: ReturnType<typeof aEdificacionApi>): Promise<void> {
  // El proyecto no se puede cambiar después de creado (lo fija la nube)
  const { proyecto_id: _fijo, ...resto } = cuerpo;
  const r = await fetch(`${BACKEND_URL}/nube/api/edificaciones/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resto),
  });
  if (!r.ok) throw new Error(String(r.status));
}

/** Enlace de descarga de un documento guardado (lo trae el backend local desde S3). */
export function enlaceDocumento(d: DocumentoGuardado): string {
  const q = new URLSearchParams({ key: d.archivo_url, nombre: d.descripcion || d.archivo_url.split('/').pop() || 'documento' });
  return `${BACKEND_URL}/edificio/documento?${q}`;
}

const aTexto = (v: number | string | null | undefined) => (v === null || v === undefined ? '' : String(v));
/** Número guardado → texto con coma decimal, como lo escribe el usuario. */
const aDecimal = (v: number | string | null | undefined) => (v === null || v === undefined ? '' : String(Number(v)).replace('.', ','));

export function desdeApi(e: EdificacionApi): { form: EdificioForm; ubicacion: Ubicacion | null } {
  const tipo = (['casa', 'edificio', 'ph'] as const).find(t => t === e.tipo_propiedad) ?? '';
  const destino = (['vivienda', 'comercial', 'mixto', 'oficinas'] as const).find(t => t === e.destino) ?? '';
  const precision = (['exacto', 'aproximado', 'desconocido'] as const).find(t => t === e.anio_precision)
    ?? (e.anio_construccion ? 'exacto' : 'desconocido');
  const pisos = e.pisos_sobre_pb ?? (e.cantidad_plantas ? Math.max(0, e.cantidad_plantas - 1) : null);
  return {
    form: {
      nombre: e.nombre ?? '', tipoPropiedad: tipo, proyectoId: String(e.proyecto_id), destino,
      calleNumero: e.calle_numero ?? e.direccion ?? '', localidad: e.localidad ?? '', provincia: e.provincia ?? '',
      pais: e.pais ?? 'Argentina', codigoPostal: e.codigo_postal ?? '',
      anioPrecision: precision, anio: aTexto(e.anio_construccion), pisos: aTexto(pisos), subsuelos: aTexto(e.subsuelos),
      superficieCubierta: aDecimal(e.superficie_cubierta), superficieTerreno: aDecimal(e.superficie_terreno),
      modificaciones: e.modificaciones ?? '',
      matricula: e.matricula ?? '', nomenclatura: e.nomenclatura_catastral ?? '', partida: e.partida_inmobiliaria ?? '',
      valuacion: aDecimal(e.valuacion_fiscal), linderos: e.linderos ?? '',
      phUnidades: aTexto(e.ph_unidades_funcionales), phUnidadFuncional: e.ph_unidad_funcional ?? '', phPorcentual: aDecimal(e.ph_porcentual),
      responsable: e.responsable ?? '', contacto: e.contacto ?? '',
    },
    ubicacion: e.latitud !== null && e.longitud !== null
      ? { lat: Number(e.latitud), lon: Number(e.longitud), direccionNormalizada: null }
      : null,
  };
}

export const etiquetaDe = <T extends string>(lista: { valor: T; etiqueta: string }[], v: string | null) =>
  lista.find(x => x.valor === v)?.etiqueta ?? (v || '—');

export const NOMBRE_DOCUMENTO: Record<string, string> = {
  ...Object.fromEntries(DOCUMENTOS.map(d => [d.valor, d.etiqueta])),
  plano_ph: 'Plano de PH',
};

export type ResultadoEliminar = { ok: true } | { ok: false; motivo: 'en_uso'; relevamientos: number } | { ok: false; motivo: 'red' };

/** Borra la edificación y sus documentos. Si tiene inspecciones, solo con `forzar` (las borra también). */
export async function eliminarEdificacion(id: string, forzar = false): Promise<ResultadoEliminar> {
  try {
    const r = await fetch(`${BACKEND_URL}/nube/api/edificaciones/${id}${forzar ? '?forzar=true' : ''}`, { method: 'DELETE' });
    if (r.status === 409) {
      const d = await r.json().catch(() => ({}));
      return { ok: false, motivo: 'en_uso', relevamientos: Number(d.relevamientos) || 0 };
    }
    return r.ok ? { ok: true } : { ok: false, motivo: 'red' };
  } catch {
    return { ok: false, motivo: 'red' };
  }
}

/** Quita un documento ya subido (se borra su registro; el archivo queda en S3). */
export async function eliminarDocumento(id: number): Promise<boolean> {
  try {
    const r = await fetch(`${BACKEND_URL}/nube/api/documentos/${id}`, { method: 'DELETE' });
    return r.ok;
  } catch {
    return false;
  }
}
