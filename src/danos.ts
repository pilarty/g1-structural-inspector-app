// Tipos de daño que reconoce el clasificador. Las 11 primeras son las clases del modelo v2
// (EfficientNetB0); las de abajo son del modelo anterior, para las inspecciones viejas.
// La app muestra el tipo de daño y la confianza del modelo.

export interface TipoDano {
  /** Nombre de la clase tal como la guarda el modelo (inglés) */
  clase: string;
  etiqueta: string;
  color: string;
}

export const TIPOS_DANO: TipoDano[] = [
  // Modelo de clasificación v2
  { clase: 'Structural crack',            etiqueta: 'Grieta estructural',          color: '#DC2626' },
  { clase: 'Concrete spalling',           etiqueta: 'Desprendimiento de hormigón', color: '#7C3AED' },
  { clase: 'Corrosion',                   etiqueta: 'Corrosión',                   color: '#92400E' },
  { clase: 'Delamination',                etiqueta: 'Delaminación',                color: '#DB2777' },
  { clase: 'Material loss/erosion',       etiqueta: 'Pérdida de material',         color: '#EA580C' },
  { clase: 'Surface flaking/exfoliation', etiqueta: 'Descascaramiento',            color: '#D97706' },
  { clase: 'Moisture/water damage',       etiqueta: 'Humedad',                     color: '#2563EB' },
  { clase: 'Salt weathering',             etiqueta: 'Eflorescencia salina',        color: '#0891B2' },
  { clase: 'Biological growth',           etiqueta: 'Crecimiento biológico',       color: '#16A34A' },
  { clase: 'Vegetation',                  etiqueta: 'Vegetación',                  color: '#65A30D' },
  { clase: 'Vandalism',                   etiqueta: 'Vandalismo',                  color: '#475569' },
  // Modelo anterior
  { clase: 'Shear crack',            etiqueta: 'Grieta de corte',             color: '#B91C1C' },
  { clase: 'Diagonal crack',         etiqueta: 'Grieta diagonal',             color: '#C2410C' },
  { clase: 'Flexural/rocking crack', etiqueta: 'Grieta de flexión',           color: '#B45309' },
  { clase: 'Detachment crack',       etiqueta: 'Grieta de desprendimiento',   color: '#BE185D' },
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
