import React, { useEffect, useState } from 'react';
import { BACKEND_URL } from './sesion';
import { severityColor, severityLabel } from './data';
import type { SeverityLevel } from './data';
import { horaLocal } from './formato';
import TurquoiseCard from './components/TurquoiseCard';
import { PanelLabel, PanelText, PanelTitle } from './components/PanelText';

interface Hallazgo {
  id: number;
  tipo_dano: string | null;
  severidad: string | null;
  ubicacion_x: number | null;
  ubicacion_y: number | null;
  imagen_representativa_url: string | null;
  probabilidad_promedio: number | null;
  fecha_deteccion: string | null;
}

const ORDEN: SeverityLevel[] = ['critical', 'high', 'medium', 'low'];

function severidadDe(h: Hallazgo): SeverityLevel {
  return ORDEN.includes(h.severidad as SeverityLevel) ? (h.severidad as SeverityLevel) : 'low';
}

// ---- Cálculo de la vista (se mantiene aparte para poder probarlo) ----
const W = 800;
const H = 600;
const MARGEN = { izq: 64, der: 24, arriba: 24, abajo: 48 };

function paso(aprox: number): number {
  const base = Math.pow(10, Math.floor(Math.log10(aprox)));
  const f = aprox / base;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * base;
}

function marcas(min: number, max: number, p: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(min / p) * p; v <= max + 1e-9; v += p) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export function calcularVista(pts: { x: number; y: number }[]) {
  let minX = Math.min(...pts.map(p => p.x));
  let maxX = Math.max(...pts.map(p => p.x));
  let minY = Math.min(...pts.map(p => p.y));
  let maxY = Math.max(...pts.map(p => p.y));
  const spanMinimo = 4; // metros, para que un punto solo no quede gigante
  if (maxX - minX < spanMinimo) {
    const c = (minX + maxX) / 2;
    minX = c - spanMinimo / 2;
    maxX = c + spanMinimo / 2;
  }
  if (maxY - minY < spanMinimo) {
    const c = (minY + maxY) / 2;
    minY = c - spanMinimo / 2;
    maxY = c + spanMinimo / 2;
  }
  const padX = (maxX - minX) * 0.12;
  const padY = (maxY - minY) * 0.12;
  minX -= padX; maxX += padX; minY -= padY; maxY += padY;

  const anchoUtil = W - MARGEN.izq - MARGEN.der;
  const altoUtil = H - MARGEN.arriba - MARGEN.abajo;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const escala = Math.min(anchoUtil / spanX, altoUtil / spanY); // misma escala en ambos ejes
  const offX = MARGEN.izq + (anchoUtil - spanX * escala) / 2;
  const offY = MARGEN.arriba + (altoUtil - spanY * escala) / 2;

  const px = (x: number) => offX + (x - minX) * escala;
  const py = (y: number) => offY + (maxY - y) * escala; // el eje Y crece hacia arriba
  const p = paso(Math.max(spanX, spanY) / 6);
  return {
    px, py,
    marcasX: marcas(minX, maxX, p),
    marcasY: marcas(minY, maxY, p),
    area: { x1: offX, y1: offY, x2: offX + spanX * escala, y2: offY + spanY * escala },
  };
}

// ---- Componente ----
export default function MapaHallazgos({
  relevamientoId,
  enCurso = false,
}: {
  relevamientoId?: number;
  enCurso?: boolean;
}) {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selId, setSelId] = useState<number | null>(null);
  const [fotos, setFotos] = useState<Record<string, { url: string; t: number }>>({});

  useEffect(() => {
    if (relevamientoId == null) {
      setCargando(false);
      return;
    }
    let cancelado = false;
    async function cargar() {
      try {
        const res = await fetch(`${BACKEND_URL}/nube/api/relevamientos/${relevamientoId}/hallazgos`);
        if (!res.ok) throw new Error(String(res.status));
        const data: Hallazgo[] = await res.json();
        if (!cancelado) {
          setHallazgos(data);
          setError(null);
        }
      } catch {
        if (!cancelado) setError('No se pudieron cargar los hallazgos.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    setCargando(true);
    setSelId(null);
    cargar();
    const timer = enCurso ? setInterval(cargar, 4000) : undefined;
    return () => {
      cancelado = true;
      if (timer) clearInterval(timer);
    };
  }, [relevamientoId, enCurso]);

  const sel = hallazgos.find(h => h.id === selId) ?? null;
  const claveFoto = sel?.imagen_representativa_url ?? null;

  useEffect(() => {
    if (!claveFoto) return;
    if (fotos[claveFoto] && Date.now() - fotos[claveFoto].t < 240000) return; // el enlace dura 5 min
    let cancelado = false;
    fetch(`${BACKEND_URL}/nube/api/archivos/descarga?key=${encodeURIComponent(claveFoto)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.url && !cancelado) setFotos(f => ({ ...f, [claveFoto]: { url: d.url, t: Date.now() } }));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [claveFoto]);

  const puntos = hallazgos.filter(h => h.ubicacion_x != null && h.ubicacion_y != null);
  const vista = puntos.length > 0
    ? calcularVista(puntos.map(h => ({ x: Number(h.ubicacion_x), y: Number(h.ubicacion_y) })))
    : null;
  const cuenta = (s: SeverityLevel) => hallazgos.filter(h => severidadDe(h) === s).length;
  const foto = claveFoto ? fotos[claveFoto]?.url : undefined;

  let mensaje: string | null = null;
  if (cargando) mensaje = 'Cargando hallazgos…';
  else if (error) mensaje = error;
  else if (hallazgos.length === 0) mensaje = 'Este relevamiento no registró hallazgos.';

  return (
    <div className="absolute inset-0">
      {/* Mapa de posiciones */}
      <div className="absolute top-0 bottom-0 left-0" style={{ right: 304 }}>
        {vista && !mensaje ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" fill="none" preserveAspectRatio="xMidYMid meet">
            <rect x={vista.area.x1} y={vista.area.y1} width={vista.area.x2 - vista.area.x1} height={vista.area.y2 - vista.area.y1} fill="rgba(255,255,255,0.92)" stroke="#C8C5BF" strokeWidth="2" />
            {vista.marcasX.map(v => (
              <g key={`x${v}`}>
                <line x1={vista.px(v)} y1={vista.area.y1} x2={vista.px(v)} y2={vista.area.y2} stroke="#F0EDE8" strokeWidth="1" />
                <text x={vista.px(v)} y={vista.area.y2 + 16} textAnchor="middle" fontSize="10" fill="#8A8C8E" fontFamily="IBM Plex Sans, sans-serif">{v}</text>
              </g>
            ))}
            {vista.marcasY.map(v => (
              <g key={`y${v}`}>
                <line x1={vista.area.x1} y1={vista.py(v)} x2={vista.area.x2} y2={vista.py(v)} stroke="#F0EDE8" strokeWidth="1" />
                <text x={vista.area.x1 - 8} y={vista.py(v) + 3} textAnchor="end" fontSize="10" fill="#8A8C8E" fontFamily="IBM Plex Sans, sans-serif">{v}</text>
              </g>
            ))}
            <text x={(vista.area.x1 + vista.area.x2) / 2} y={H - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="#8A8C8E" fontFamily="IBM Plex Sans, sans-serif">Posición X (m)</text>
            <text transform={`translate(14 ${(vista.area.y1 + vista.area.y2) / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fontWeight="600" fill="#8A8C8E" fontFamily="IBM Plex Sans, sans-serif">Posición Y (m)</text>

            {puntos.map(h => {
              const cx = vista.px(Number(h.ubicacion_x));
              const cy = vista.py(Number(h.ubicacion_y));
              const color = severityColor[severidadDe(h)];
              return (
                <g key={h.id} onClick={() => setSelId(h.id)} style={{ cursor: 'pointer' }}>
                  {h.id === selId && <circle cx={cx} cy={cy} r="15" fill={color} fillOpacity="0.22" />}
                  <circle cx={cx} cy={cy} r="8" fill={color} stroke="white" strokeWidth="2" />
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center">
            <p className="text-[13px] text-[#8A8C8E]">{mensaje ?? 'Sin posiciones registradas.'}</p>
          </div>
        )}
      </div>

      {/* Panel de hallazgos */}
      <TurquoiseCard size="overlay" className="absolute top-4 right-4 bottom-4 w-[288px] flex flex-col">
        <div className="px-3.5 pt-3 pb-2">
          <PanelTitle>Hallazgos ({hallazgos.length})</PanelTitle>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
            {ORDEN.map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-none" style={{ background: severityColor[s] }} />
                <PanelText className="leading-none">{severityLabel[s]} {cuenta(s)}</PanelText>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
          {hallazgos.map(h => {
            const s = severidadDe(h);
            const activo = h.id === selId;
            return (
              <div key={h.id}>
                <button
                  onClick={() => setSelId(activo ? null : h.id)}
                  className={`w-full flex items-center gap-2 px-2 py-2 text-left rounded-md transition-colors ${activo ? 'bg-white/80' : 'hover:bg-white/50'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: severityColor[s] }} />
                  <span className="flex-1 min-w-0 truncate text-[12px] font-semibold text-[#1A1C1E]">{h.tipo_dano ?? 'Sin clasificar'}</span>
                  <span className="text-[11px] text-[#66686A] flex-none">
                    {h.probabilidad_promedio != null ? `${Math.round(Number(h.probabilidad_promedio) * 100)}%` : ''}
                  </span>
                </button>
                {activo && (
                  <div className="px-2 pb-2.5 pt-1 bg-white/80 rounded-b-md -mt-1">
                    {claveFoto && (
                      foto
                        ? <img src={foto} alt={h.tipo_dano ?? 'Hallazgo'} className="w-full rounded-lg mb-2 bg-[#EDEBE6]" />
                        : <div className="w-full h-24 rounded-lg mb-2 bg-[#EDEBE6] flex items-center justify-center text-[11px] text-[#8A8C8E]">Cargando foto…</div>
                    )}
                    <div className="flex gap-6">
                      <div>
                        <PanelLabel>Severidad</PanelLabel>
                        <PanelText className="font-semibold">{severityLabel[s]}</PanelText>
                      </div>
                      <div>
                        <PanelLabel>Posición (m)</PanelLabel>
                        <PanelText className="font-semibold">
                          {h.ubicacion_x != null && h.ubicacion_y != null
                            ? `${Number(h.ubicacion_x).toFixed(1)}, ${Number(h.ubicacion_y).toFixed(1)}`
                            : '—'}
                        </PanelText>
                      </div>
                    </div>
                    {h.fecha_deteccion && (
                      <p className="text-[11px] text-[#8A8C8E] mt-1.5">Detectado a las {horaLocal(h.fecha_deteccion)}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </TurquoiseCard>
    </div>
  );
}
