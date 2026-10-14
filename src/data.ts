export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface RiskZone {
  name: string;
  severity: SeverityLevel;
}

export interface HistorialEntry {
  date: string;
  detections: number;
  severity: SeverityLevel;
  robot: string;
  // Lo siguiente solo viene en los edificios cargados desde la nube
  /** id del relevamiento (inspección) */
  id?: number;
  operador?: string;
  estado?: string;
  inicio?: string | null;
  fin?: string | null;
  breakdown?: Record<SeverityLevel, number>;
}

export interface UltimoRelevamiento {
  id: number;
  estado: string;
  inicio: string | null;
  fin: string | null;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  floors: number;
  yearBuilt: number;
  relevamientos: number;
  lastRelevamiento: string;
  lastRelevamientoDate: string;
  lastDetections: number;
  highestSeverity: SeverityLevel;
  planStatus: 'configured' | 'unconfigured';
  lastSeverityBreakdown: Record<SeverityLevel, number>;
  lastRobot: string;
  lastOperator: string;
  riskZones: RiskZone[];
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

export const severityLabel: Record<SeverityLevel, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const severityColor: Record<SeverityLevel, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#FBBF24',
  low: '#10B981',
};

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Municipalidad CABA — Zona Norte',
    buildings: [
      {
        id: 'b1',
        name: 'Edificio Corrientes 1234',
        address: 'Av. Corrientes 1234, CABA',
        floors: 8,
        yearBuilt: 1978,
        relevamientos: 4,
        lastRelevamiento: 'hace 2 días',
        lastRelevamientoDate: '12 ago 2026',
        lastDetections: 5,
        highestSeverity: 'critical',
        planStatus: 'configured',
        lastSeverityBreakdown: { low: 2, medium: 1, high: 1, critical: 1 },
        lastRobot: 'HR-04 / Unidad 2',
        lastOperator: 'M. García',
        riskZones: [
          { name: 'Sala A — Planta 3', severity: 'critical' },
          { name: 'Escalera principal', severity: 'high' },
          { name: 'Sala B — Planta 1', severity: 'medium' },
        ],
        historial: [
          { date: '12 ago 2026', detections: 5, severity: 'critical', robot: 'HR-04' },
          { date: '6 ago 2026',  detections: 3, severity: 'high',     robot: 'HR-04' },
          { date: '15 jul 2026', detections: 7, severity: 'critical', robot: 'HR-02' },
          { date: '3 jun 2026',  detections: 2, severity: 'medium',   robot: 'HR-04' },
        ],
      },
      {
        id: 'b2',
        name: 'Palacio Municipal Anexo B',
        address: 'Juramento 2450, CABA',
        floors: 5,
        yearBuilt: 1962,
        relevamientos: 2,
        lastRelevamiento: 'hace 8 días',
        lastRelevamientoDate: '6 ago 2026',
        lastDetections: 3,
        highestSeverity: 'high',
        planStatus: 'configured',
        lastSeverityBreakdown: { low: 1, medium: 1, high: 1, critical: 0 },
        lastRobot: 'HR-02 / Unidad 1',
        lastOperator: 'P. Soria',
        riskZones: [
          { name: 'Acceso lateral — PB', severity: 'high' },
          { name: 'Oficina 3 — Planta 2', severity: 'medium' },
        ],
        historial: [
          { date: '6 ago 2026',  detections: 3, severity: 'high', robot: 'HR-02' },
          { date: '18 jul 2026', detections: 5, severity: 'high', robot: 'HR-02' },
        ],
      },
      {
        id: 'b3',
        name: 'Centro Cultural Recoleta',
        address: 'Junín 1930, CABA',
        floors: 3,
        yearBuilt: 1990,
        relevamientos: 1,
        lastRelevamiento: 'hace 21 días',
        lastRelevamientoDate: '24 jul 2026',
        lastDetections: 1,
        highestSeverity: 'low',
        planStatus: 'unconfigured',
        lastSeverityBreakdown: { low: 1, medium: 0, high: 0, critical: 0 },
        lastRobot: 'HR-01 / Unidad 3',
        lastOperator: 'L. Ferreyra',
        riskZones: [
          { name: 'Sala de exposición — PB', severity: 'low' },
        ],
        historial: [
          { date: '24 jul 2026', detections: 1, severity: 'low', robot: 'HR-01' },
        ],
      },
    ],
  },
  {
    id: 'p2',
    name: 'Consorcio San Telmo',
    buildings: [
      {
        id: 'b4',
        name: 'Residencial Bolívar 540',
        address: 'Bolívar 540, San Telmo',
        floors: 6,
        yearBuilt: 1948,
        relevamientos: 3,
        lastRelevamiento: 'hace 5 días',
        lastRelevamientoDate: '9 ago 2026',
        lastDetections: 8,
        highestSeverity: 'critical',
        planStatus: 'configured',
        lastSeverityBreakdown: { low: 1, medium: 2, high: 3, critical: 2 },
        lastRobot: 'HR-04 / Unidad 1',
        lastOperator: 'M. García',
        riskZones: [
          { name: 'Sótano — Sector A', severity: 'critical' },
          { name: 'Escalera trasera', severity: 'critical' },
          { name: 'Fachada norte — PB', severity: 'high' },
        ],
        historial: [
          { date: '9 ago 2026',  detections: 8, severity: 'critical', robot: 'HR-04' },
          { date: '20 jul 2026', detections: 6, severity: 'critical', robot: 'HR-04' },
          { date: '2 jun 2026',  detections: 4, severity: 'high',     robot: 'HR-02' },
        ],
      },
      {
        id: 'b5',
        name: 'Edificio Defensa 780',
        address: 'Defensa 780, San Telmo',
        floors: 4,
        yearBuilt: 1955,
        relevamientos: 1,
        lastRelevamiento: 'hace 14 días',
        lastRelevamientoDate: '29 jul 2026',
        lastDetections: 2,
        highestSeverity: 'medium',
        planStatus: 'configured',
        lastSeverityBreakdown: { low: 1, medium: 1, high: 0, critical: 0 },
        lastRobot: 'HR-01 / Unidad 2',
        lastOperator: 'P. Soria',
        riskZones: [
          { name: 'Terraza — Planta 4', severity: 'medium' },
          { name: 'Hall de ingreso', severity: 'low' },
        ],
        historial: [
          { date: '29 jul 2026', detections: 2, severity: 'medium', robot: 'HR-01' },
        ],
      },
    ],
  },
  {
    id: 'p3',
    name: 'Privado — Estudio Vidal & Asoc.',
    buildings: [
      {
        id: 'b6',
        name: 'Torre Libertador 4500',
        address: 'Av. del Libertador 4500, Palermo',
        floors: 22,
        yearBuilt: 2003,
        relevamientos: 0,
        lastRelevamiento: 'Sin relevamientos',
        lastRelevamientoDate: '—',
        lastDetections: 0,
        highestSeverity: 'low',
        planStatus: 'unconfigured',
        lastSeverityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
        lastRobot: '—',
        lastOperator: '—',
        riskZones: [],
        historial: [],
      },
    ],
  },
];

export const recentActivity = [
  { id: 'a1', type: 'relevamiento', text: 'Relevamiento completado — Corrientes 1234', detail: '5 detecciones, 1 crítica', time: 'Hoy 16:05' },
  { id: 'a2', type: 'detection',    text: 'Nueva detección crítica marcada — Corrientes 1234', detail: 'Desprendimiento, prob. 95%', time: 'Hoy 14:45' },
  { id: 'a3', type: 'relevamiento', text: 'Relevamiento completado — Bolívar 540', detail: '8 detecciones, 2 críticas', time: 'Hace 5 días' },
  { id: 'a4', type: 'config',       text: 'Plano configurado — Palacio Municipal Anexo B', detail: 'Planta 1 activa', time: 'Hace 6 días' },
  { id: 'a5', type: 'relevamiento', text: 'Relevamiento completado — Palacio Municipal Anexo B', detail: '3 detecciones', time: 'Hace 8 días' },
];
