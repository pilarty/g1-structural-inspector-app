// Tipos de los datos que vienen de la nube (proyectos, edificaciones e inspecciones).

export interface HistorialEntry {
  date: string;
  detections: number;
  robot: string;
  // Lo siguiente solo viene en los edificios cargados desde la nube
  /** id del relevamiento (inspección) */
  id?: number;
  operador?: string;
  estado?: string;
  inicio?: string | null;
  fin?: string | null;
  /** Planta (piso) que se inspeccionó, si se indicó */
  planta?: string;
}

export interface UltimoRelevamiento {
  id: number;
  planta?: string;
  estado: string;
  inicio: string | null;
  fin: string | null;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  floors: number;
  /** Pisos sobre planta baja y subsuelos (de la ficha) */
  pisos?: number;
  subsuelos?: number;
  yearBuilt: number;
  relevamientos: number;
  lastRelevamiento: string;
  lastRelevamientoDate: string;
  lastDetections: number;
  planStatus: 'configured' | 'unconfigured';
  lastRobot: string;
  lastOperator: string;
  historial: HistorialEntry[];
  ultimoRelevamiento?: UltimoRelevamiento;
  /** Coordenadas (Georef), si la dirección se ubicó */
  lat?: number;
  lon?: number;
}

export interface Project {
  id: string;
  name: string;
  buildings: Building[];
}
