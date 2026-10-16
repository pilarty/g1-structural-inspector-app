// Tipos de daño que reconoce el clasificador (las 7 clases del modelo).
// La app muestra el tipo de daño y la confianza del modelo.

export interface TipoDano {
  /** Nombre de la clase tal como la guarda el modelo (inglés) */
  clase: string;
  etiqueta: string;
  color: string;
}

export const TIPOS_DANO: TipoDano[] = [
  { clase: 'Shear crack',            etiqueta: 'Grieta de corte',             color: '#DC2626' },
  { clase: 'Diagonal crack',         etiqueta: 'Grieta diagonal',             color: '#EA580C' },
  { clase: 'Flexural/rocking crack', etiqueta: 'Grieta de flexión',           color: '#D97706' },
  { clase: 'Detachment crack',       etiqueta: 'Grieta de desprendimiento',   color: '#DB2777' },
  { clase: 'Concrete spalling',      etiqueta: 'Desprendimiento de hormigón', color: '#7C3AED' },
  { clase: 'Corrosion',              etiqueta: 'Corrosión',                   color: '#92400E' },
  { clase: 'Debris',                 etiqueta: 'Escombros',                   color: '#0D9488' },
];

export const SIN_CLASIFICAR: TipoDano = { clase: '', etiqueta: 'Sin clasificar', color: '#8A8C8E' };

/** Datos para mostrar un tipo de daño (acepta la clase en inglés o el nombre en español). */
export function infoDano(tipo: string | null | undefined): TipoDano {
  if (!tipo) return SIN_CLASIFICAR;
  const t = tipo.trim().toLowerCase();
  return TIPOS_DANO.find(d => d.clase.toLowerCase() === t || d.etiqueta.toLowerCase() === t)
    ?? (t === 'sin clasificar' ? SIN_CLASIFICAR : { clase: tipo, etiqueta: tipo.charAt(0).toUpperCase() + tipo.slice(1), color: '#8A8C8E' });
}
