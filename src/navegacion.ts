// Acciones de navegación que se disparan desde componentes que aparecen en varias
// pantallas (como la barra de proyectos). App registra qué hacer en cada una.

// Cambios sin guardar

let haySinGuardar: (() => boolean) | null = null;

/** Un formulario registra cómo saber si tiene cambios sin guardar (null al cerrarse). */
export function registrarCambiosSinGuardar(f: (() => boolean) | null) {
  haySinGuardar = f;
}

let pedirConfirmacion: ((seguir: () => void) => void) | null = null;

/** El cartel «¿Salir sin guardar?» se registra acá (null al desmontarse). */
export function registrarDialogoSalir(f: ((seguir: () => void) => void) | null) {
  pedirConfirmacion = f;
}

/** Hace `accion` si no hay cambios sin guardar; si los hay, pregunta antes con el cartel de la app. */
export function salirSiSePuede(accion: () => void) {
  if (!haySinGuardar || !haySinGuardar()) accion();
  else if (pedirConfirmacion) pedirConfirmacion(accion);
  else if (window.confirm('Tenés cambios sin guardar. ¿Salir sin guardar?')) accion();
}

let alNuevoEdificioEn: ((proyectoId: string) => void) | null = null;

export function registrarNuevoEdificioEn(f: (proyectoId: string) => void) {
  alNuevoEdificioEn = f;
}

let alNuevoProyecto: (() => void) | null = null;

export function registrarNuevoProyecto(f: () => void) {
  alNuevoProyecto = f;
}

/** Abre «Nuevo proyecto». */
export function nuevoProyecto() {
  salirSiSePuede(() => alNuevoProyecto?.());
}

let alEliminar: ((tipo: 'proyecto' | 'edificio', id: string) => void) | null = null;

export function registrarAlEliminar(f: (tipo: 'proyecto' | 'edificio', id: string) => void) {
  alEliminar = f;
}

/** Avisa que se eliminó un proyecto o una edificación (App sale de la pantalla si la mostraba). */
export function eliminado(tipo: 'proyecto' | 'edificio', id: string) {
  alEliminar?.(tipo, id);
}

let alEditar: ((tipo: 'proyecto' | 'edificio', id: string) => void) | null = null;

export function registrarAlEditar(f: (tipo: 'proyecto' | 'edificio', id: string) => void) {
  alEditar = f;
}

/** Abre el formulario de edición de un proyecto o una edificación. */
export function editarElemento(tipo: 'proyecto' | 'edificio', id: string) {
  salirSiSePuede(() => alEditar?.(tipo, id));
}

let alVerProyecto: ((id: string) => void) | null = null;

export function registrarVerProyecto(f: (id: string) => void) {
  alVerProyecto = f;
}

/** Abre la ficha de un proyecto. */
export function verProyecto(id: string) {
  salirSiSePuede(() => alVerProyecto?.(id));
}

/** Abre «Nuevo edificio» con ese proyecto ya elegido. */
export function nuevoEdificioEn(proyectoId: string) {
  salirSiSePuede(() => alNuevoEdificioEn?.(proyectoId));
}
