// Por qué se hace una inspección (se elige al iniciarla; sale en el informe).

export const MOTIVOS = [
  { valor: 'rutina', etiqueta: 'Rutina' },
  { valor: 'seguimiento', etiqueta: 'Seguimiento de daños' },
  { valor: 'post_evento', etiqueta: 'Post-evento (sismo, incendio, impacto)', corta: 'Post-evento' },
  { valor: 'tasacion', etiqueta: 'Pre-compra / tasación' },
];

/** Etiqueta para mostrar. Si el motivo lo escribió el usuario («Otro»), se muestra tal cual. */
export const etiquetaMotivo = (m?: string | null) => (m ? MOTIVOS.find(x => x.valor === m)?.etiqueta ?? m : null);
