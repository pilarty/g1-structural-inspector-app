import React, { useEffect, useRef, useState } from 'react';
import { BACKEND_URL } from './sesion';
import { infoDano } from './danos';
import { horaLocal } from './formato';
import DetalleDeteccion, { type Revision } from './components/DetalleDeteccion';
import { Check, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, X as Cruz } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import Informe, { type DatosInforme, type HallazgoInforme } from './components/Informe';
import { TIPOS_CLIENTE, obtenerProyecto } from './proyectoForm';
import { etiquetaDe } from './edificioForm';

interface Hallazgo {
  id: number;
  tipo_dano: string | null;
  ubicacion_x: number | null;
  ubicacion_y: number | null;
  imagen_representativa_url: string | null;
  probabilidad_promedio: number | null;
  fecha_deteccion: string | null;
}


/** Un punto del camino del robot (metros, y hacia dónde mira en radianes). */
interface Punto { t: number; x: number; y: number; yaw: number | null }
interface Pose extends Punto { relevamiento_id: number | null }
/** Plano del lugar: celdas de 5 cm donde hay pared u objeto (del escenario o del LiDAR). */
interface Capas { paredes: boolean; camino: boolean; hallazgos: boolean }
interface Plano { floor_polygon?: [number, number][]; paredes?: { resolucion: number; celdas: [number, number][] } | null }


// ---- Cálculo de la vista (se mantiene aparte para poder probarlo) ----
const W = 800;
const H = 600;
const MARGEN = { izq: 24, der: 24, arriba: 24, abajo: 24 };

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
  informe,
  exportarRef,
  onExportando,
}: {
  relevamientoId?: number;
  enCurso?: boolean;
  /** Datos de la inspección para el informe PDF (sin la distancia, que se calcula acá) */
  informe?: Omit<DatosInforme, 'distancia' | 'comitente' | 'profesional' | 'matricula'>;
  /** Acá se deja la función que arma el informe, para llamarla desde el menú de la inspección */
  exportarRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  /** Avisa cuando empieza y termina de armarse el informe */
  onExportando?: (si: boolean) => void;
}) {
  const [exportando, setExportandoLocal] = useState(false);
  const setExportando = (si: boolean) => { setExportandoLocal(si); onExportando?.(si); };
  const [panelCerrado, setPanelCerrado] = useState(false); // panel de hallazgos plegado
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selId, setSelId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set()); // tipos de daño desplegados en el panel
  const [ocultos, setOcultos] = useState<Set<string>>(new Set()); // tipos de daño que no se dibujan en el plano
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'confirmado' | 'descartado'>('todos');
  const [revisiones, setRevisiones] = useState<Map<number, Revision>>(new Map());

  // Revisión del inspector de cada hallazgo (confirmado / descartado + nota)
  useEffect(() => {
    setRevisiones(new Map());
    if (relevamientoId == null) return;
    let cancelado = false;
    fetch(`${BACKEND_URL}/nube/api/relevamientos/${relevamientoId}/revisiones`)
      .then(r => (r.ok ? r.json() : []))
      .then((d: ({ hallazgo_id: number } & Revision)[]) => {
        if (!cancelado && Array.isArray(d)) {
          setRevisiones(new Map(d.map(x => [x.hallazgo_id, { estado: x.estado, nota: x.nota, intervencion: x.intervencion ?? null, plazo: x.plazo ?? null }])));
        }
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [relevamientoId]);

  async function guardarRevision(hid: number, rev: Revision) {
    try {
      const res = await fetch(`${BACKEND_URL}/nube/api/hallazgos/${hid}/revision`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rev),
      });
      if (!res.ok) return false;
      setRevisiones(m => new Map(m).set(hid, rev));
      return true;
    } catch {
      return false;
    }
  }
  const estadoDe = (hid: number) => revisiones.get(hid)?.estado ?? 'pendiente';
  const [fotos, setFotos] = useState<Record<string, { url: string; t: number }>>({});
  const [camino, setCamino] = useState<Punto[]>([]);
  const [pose, setPose] = useState<Pose | null>(null);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [capas, setCapas] = useState<Capas>({ paredes: true, camino: true, hallazgos: true });
  const [zoom, setZoom] = useState({ k: 1, dx: 0, dy: 0 });
  const [arrastre, setArrastre] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => { setZoom({ k: 1, dx: 0, dy: 0 }); }, [relevamientoId]);

  // Plano de paredes de esa inspección (puede llegar un poco después de empezar)
  useEffect(() => {
    setPlano(null);
    if (relevamientoId == null) return;
    let cancelado = false;
    const cargar = () =>
      fetch(`${BACKEND_URL}/nube/api/relevamientos/${relevamientoId}/plano`)
        .then(r => (r.ok ? r.json() : null))
        .then((d: Plano | null) => { if (!cancelado && d) setPlano(d); })
        .catch(() => {});
    cargar();
    const timer = enCurso ? setInterval(cargar, 10000) : undefined;
    return () => { cancelado = true; if (timer) clearInterval(timer); };
  }, [relevamientoId, enCurso]);

  // Camino del robot guardado en la nube (durante la inspección se va actualizando)
  useEffect(() => {
    setCamino([]);
    if (relevamientoId == null) return;
    let cancelado = false;
    const cargar = () =>
      fetch(`${BACKEND_URL}/nube/api/relevamientos/${relevamientoId}/trayectoria`)
        .then(r => (r.ok ? r.json() : []))
        .then((d: Punto[]) => { if (!cancelado && Array.isArray(d)) setCamino(d); })
        .catch(() => {});
    cargar();
    const timer = enCurso ? setInterval(cargar, 3000) : undefined;
    return () => { cancelado = true; if (timer) clearInterval(timer); };
  }, [relevamientoId, enCurso]);

  // Posición en vivo (solo mientras la inspección está en curso)
  useEffect(() => {
    setPose(null);
    if (!enCurso || relevamientoId == null) return;
    let cancelado = false;
    const mirar = () =>
      fetch(`${BACKEND_URL}/pose`)
        .then(r => (r.ok ? r.json() : null))
        .then((d: Pose | null) => { if (!cancelado) setPose(d && d.relevamiento_id === relevamientoId ? d : null); })
        .catch(() => {});
    mirar();
    const timer = setInterval(mirar, 1000);
    return () => { cancelado = true; clearInterval(timer); };
  }, [relevamientoId, enCurso]);

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

  // Lo que el usuario eligió ver: por tipo de daño y por estado de revisión
  const seVe = (h: Hallazgo) =>
    !ocultos.has(infoDano(h.tipo_dano).etiqueta) && (filtroEstado === 'todos' || estadoDe(h.id) === filtroEstado);
  const puntos = hallazgos.filter(h => h.ubicacion_x != null && h.ubicacion_y != null);
  // El camino completo: lo guardado más la posición en vivo (si llegó después del último punto)
  const recorrido: Punto[] = pose && (camino.length === 0 || pose.t > camino[camino.length - 1].t) ? [...camino, pose] : camino;
  const todos = [
    ...puntos.map(h => ({ x: Number(h.ubicacion_x), y: Number(h.ubicacion_y) })),
    ...recorrido.map(p => ({ x: p.x, y: p.y })),
  ];
  // El plano también entra en la vista (sus esquinas)
  const paredes = plano?.paredes?.celdas?.length ? plano.paredes : null;
  if (paredes) {
    const res = paredes.resolucion;
    const is = paredes.celdas.map(c => c[0]);
    const js = paredes.celdas.map(c => c[1]);
    todos.push({ x: Math.min(...is) * res, y: Math.min(...js) * res }, { x: (Math.max(...is) + 1) * res, y: (Math.max(...js) + 1) * res });
  }
  const vista = todos.length > 0 ? calcularVista(todos) : null;
  const inicio = recorrido[0];
  const actual = recorrido[recorrido.length - 1];
  // Cuántos hallazgos hay de cada tipo de daño (de mayor a menor)
  const porTipo = [...hallazgos.reduce((m, h) => {
    const t = infoDano(h.tipo_dano);
    const e = m.get(t.etiqueta) ?? { tipo: t, n: 0 };
    e.n += 1;
    return m.set(t.etiqueta, e);
  }, new Map<string, { tipo: ReturnType<typeof infoDano>; n: number }>()).values()].sort((a, b) => b.n - a.n);
  const foto = claveFoto ? fotos[claveFoto]?.url : undefined;

  let mensaje: string | null = null;
  if (cargando) mensaje = 'Cargando hallazgos…';
  else if (error) mensaje = error;
  else if (hallazgos.length === 0 && recorrido.length === 0 && !paredes)
    mensaje = enCurso ? 'Esperando la posición del robot…' : 'Este relevamiento no registró hallazgos.';

  // Zoom y desplazamiento (rueda del mouse y arrastrar)
  const k = zoom.k;
  const cx = vista ? (vista.area.x1 + vista.area.x2) / 2 : 0;
  const cy = vista ? (vista.area.y1 + vista.area.y2) / 2 : 0;
  const X = (x: number) => (vista ? (vista.px(x) - cx) * k + cx + zoom.dx : 0);
  const Y = (y: number) => (vista ? (vista.py(y) - cy) * k + cy + zoom.dy : 0);

  function aSvg(e: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  function zoomEn(factor: number, centro?: { x: number; y: number }) {
    setZoom(z => {
      const nk = Math.min(10, Math.max(0.6, z.k * factor));
      const f = nk / z.k;
      const c = centro ?? { x: cx, y: cy };
      // el punto bajo el mouse queda en el mismo lugar
      return { k: nk, dx: (c.x - cx) * (1 - f) + z.dx * f, dy: (c.y - cy) * (1 - f) + z.dy * f };
    });
  }
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      zoomEn(e.deltaY < 0 ? 1.15 : 1 / 1.15, aSvg(e) ?? undefined);
    };
    svg.addEventListener('wheel', rueda, { passive: false });
    return () => svg.removeEventListener('wheel', rueda);
  });

  // Datos del recorrido
  let distancia = 0;
  for (let i = 1; i < recorrido.length; i++) {
    distancia += Math.hypot(recorrido[i].x - recorrido[i - 1].x, recorrido[i].y - recorrido[i - 1].y);
  }
  // Flechitas de sentido cada ~1 m de camino
  const flechas: { x: number; y: number; ang: number }[] = [];
  {
    let acum = 0;
    for (let i = 1; i < recorrido.length; i++) {
      const a = recorrido[i - 1], b = recorrido[i];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      acum += d;
      if (acum >= 1 && d > 0.05) {
        acum = 0;
        flechas.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, ang: Math.atan2(b.y - a.y, b.x - a.x) });
      }
    }
  }
  // Número de cada hallazgo (en el mapa y en la lista), por orden de detección
  const numero = new Map(
    [...hallazgos].sort((a, b) => (a.fecha_deteccion ?? '').localeCompare(b.fecha_deteccion ?? '') || a.id - b.id)
      .map((h, i) => [h.id, i + 1]),
  );
  const lista = [...hallazgos].sort((a, b) => (numero.get(a.id) ?? 0) - (numero.get(b.id) ?? 0));

  // Informe PDF: se arma oculto, se espera a que carguen las fotos y se guarda
  async function exportarInforme() {
    if (!informe) return;
    setExportando(true);
    const contenedor = document.createElement('div');
    contenedor.id = 'informe-impresion';
    document.body.appendChild(contenedor);
    const raiz = createRoot(contenedor);
    try {
      // Plano y recorrido se piden de nuevo, por si la pantalla todavía no los había terminado de cargar
      const [planoInf, caminoInf] = await Promise.all([
        fetch(`${BACKEND_URL}/nube/api/relevamientos/${relevamientoId}/plano`).then(r => (r.ok ? r.json() as Promise<Plano> : null)).catch(() => null),
        fetch(`${BACKEND_URL}/nube/api/relevamientos/${relevamientoId}/trayectoria`).then(r => (r.ok ? r.json() as Promise<Punto[]> : [])).catch(() => [] as Punto[]),
      ]);
      const paredesInf = planoInf?.paredes?.celdas?.length ? planoInf.paredes : paredes;
      const recorridoInf = Array.isArray(caminoInf) && caminoInf.length > recorrido.length ? caminoInf : recorrido;
      let distanciaInf = 0;
      for (let i = 1; i < recorridoInf.length; i++)
        distanciaInf += Math.hypot(recorridoInf[i].x - recorridoInf[i - 1].x, recorridoInf[i].y - recorridoInf[i - 1].y);
      // Fotos de los hallazgos que van (los descartados no)
      const incluidos = lista.filter(h => estadoDe(h.id) !== 'descartado');
      const fotos = await Promise.all(incluidos.map(async h => {
        if (!h.imagen_representativa_url) return null;
        try {
          const r = await fetch(`${BACKEND_URL}/nube/api/archivos/descarga?key=${encodeURIComponent(h.imagen_representativa_url)}`);
          const d = r.ok ? await r.json() : null;
          return (d?.url as string) ?? null;
        } catch {
          return null;
        }
      }));
      const filas: HallazgoInforme[] = incluidos.map((h, i) => ({
        numero: numero.get(h.id) ?? i + 1,
        tipo: h.tipo_dano,
        confianza: h.probabilidad_promedio != null ? Math.round(Number(h.probabilidad_promedio) * 100) : null,
        x: h.ubicacion_x != null ? Number(h.ubicacion_x) : null,
        y: h.ubicacion_y != null ? Number(h.ubicacion_y) : null,
        hora: h.fecha_deteccion ? horaLocal(h.fecha_deteccion) : '—',
        estado: estadoDe(h.id),
        nota: revisiones.get(h.id)?.nota ?? null,
        intervencion: revisiones.get(h.id)?.intervencion ?? null,
        plazo: revisiones.get(h.id)?.plazo ?? null,
        foto: fotos[i],
      }));
      const proyecto = informe.proyectoId ? await obtenerProyecto(informe.proyectoId).catch(() => null) : null;
      const datos: DatosInforme = {
        ...informe,
        comitente: proyecto?.cliente_nombre
          ? `${proyecto.cliente_nombre}${proyecto.tipo_cliente ? ` (${etiquetaDe(TIPOS_CLIENTE, proyecto.tipo_cliente)})` : ''}`
          : '',
        profesional: proyecto?.profesional_nombre ?? '',
        matricula: proyecto?.profesional_matricula ?? '',
        distancia: recorridoInf.length > 1 ? `${distanciaInf.toLocaleString('es-AR', { maximumFractionDigits: 1 })} m` : '—',
      };
      raiz.render(<Informe datos={datos} hallazgos={filas} descartados={hallazgos.length - incluidos.length}
        plano={{ paredes: paredesInf, recorrido: recorridoInf.map(p => ({ x: p.x, y: p.y })) }} />);
      // Esperar a que se dibuje y a que carguen todas las fotos
      await new Promise(r => setTimeout(r, 50));
      await Promise.all([...contenedor.querySelectorAll('img')].map(img =>
        img.complete ? null : new Promise(r => { img.onload = r; img.onerror = r; })));
      const nombre = `Informe ${informe.edificacion} ${informe.fecha}`.replace(/[\\/:*?"<>|]/g, '-');
      const puente = (window as unknown as { g1motor?: { guardarPdf?: (n: string, s?: { url: string }) => Promise<{ ruta: string | null; subido: boolean } | null> } }).g1motor;
      if (puente?.guardarPdf) {
        // Se pide un enlace firmado para guardar una copia del informe en la nube (S3)
        const subida = await fetch(`${BACKEND_URL}/nube/api/archivos/subida`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carpeta: 'informes', nombre: `${nombre}.pdf`, content_type: 'application/pdf' }),
        }).then(r => (r.ok ? r.json() as Promise<{ key: string; url: string }> : null)).catch(() => null);
        const res = await puente.guardarPdf(nombre, subida ? { url: subida.url } : undefined);
        // Si se subió, queda registrado en la base de datos junto con su fecha de generación
        if (subida && res?.subido) {
          await fetch(`${BACKEND_URL}/nube/api/informes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relevamiento_id: informe.relevamientoId, archivo_url: subida.key }),
          }).catch(() => null);
        }
      } else window.print(); // en el navegador: «Guardar como PDF» del diálogo de impresión
    } finally {
      raiz.unmount();
      contenedor.remove();
      setExportando(false);
    }
  }

  // El menú de la inspección (afuera de este componente) usa esta función para exportar
  useEffect(() => {
    if (!exportarRef) return;
    exportarRef.current = informe && !cargando && !exportando ? exportarInforme : null;
  });

  // Cuántos píxeles mide un metro con el zoom actual (para la cuadrícula)
  const metroPx = vista ? (vista.px(1) - vista.px(0)) * k : 0;
  const FUENTE = 'IBM Plex Sans, sans-serif';
  const dentroX = (px: number) => vista && px >= vista.area.x1 && px <= vista.area.x2;
  const dentroY = (py: number) => vista && py >= vista.area.y1 && py <= vista.area.y2;

  return (
    <div className="absolute inset-0">

        {/* Lienzo: el plano a la izquierda y el panel de hallazgos flotando a la derecha */}
        <div className="absolute inset-0">
        <div className={`absolute top-0 bottom-0 left-0 ${panelCerrado ? 'right-0' : 'right-[272px] xl:right-[324px]'}`}>
        {vista && !mensaje ? (
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={`absolute inset-0 w-full h-full select-none ${arrastre ? 'cursor-grabbing' : 'cursor-grab'}`}
            fill="none" preserveAspectRatio="xMidYMid meet"
            onMouseDown={e => { const p = aSvg(e); if (p) setArrastre({ x: p.x, y: p.y, dx: zoom.dx, dy: zoom.dy }); }}
            onMouseMove={e => {
              if (!arrastre) return;
              const p = aSvg(e);
              if (p) setZoom(z => ({ ...z, dx: arrastre.dx + p.x - arrastre.x, dy: arrastre.dy + p.y - arrastre.y }));
            }}
            onMouseUp={() => setArrastre(null)} onMouseLeave={() => setArrastre(null)}>
            <defs>
              <filter id="sombraPunto" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodColor="#14202B" floodOpacity="0.28" />
              </filter>
              <clipPath id="areaMapa">
                <rect x={vista.area.x1} y={vista.area.y1} width={vista.area.x2 - vista.area.x1} height={vista.area.y2 - vista.area.y1} />
              </clipPath>
            </defs>

            <rect x={vista.area.x1} y={vista.area.y1} width={vista.area.x2 - vista.area.x1} height={vista.area.y2 - vista.area.y1}
              fill="#FCFCFD" stroke="#E2E5E9" strokeWidth="1" />

            <g clipPath="url(#areaMapa)">
              {/* Cuadrícula de metros (cada 1 m, con líneas más marcadas cada 5 m) */}
              {(() => {
                const lineas = [];
                const x0 = Math.floor(vista.marcasX[0] - 20), x1 = Math.ceil(vista.marcasX[vista.marcasX.length - 1] + 20);
                const y0 = Math.floor(vista.marcasY[0] - 20), y1 = Math.ceil(vista.marcasY[vista.marcasY.length - 1] + 20);
                if (metroPx >= 8) {
                  for (let v = x0; v <= x1; v++) lineas.push(<line key={`gx${v}`} x1={X(v)} y1={vista.area.y1} x2={X(v)} y2={vista.area.y2} stroke={v % 5 === 0 ? '#E3E7EC' : '#F0F2F5'} strokeWidth="1" />);
                  for (let v = y0; v <= y1; v++) lineas.push(<line key={`gy${v}`} x1={vista.area.x1} y1={Y(v)} x2={vista.area.x2} y2={Y(v)} stroke={v % 5 === 0 ? '#E3E7EC' : '#F0F2F5'} strokeWidth="1" />);
                }
                return lineas;
              })()}

              {/* Paredes y objetos */}
              {capas.paredes && paredes && (() => {
                const res = paredes.resolucion;
                const lado = (vista.px(res) - vista.px(0)) * k;
                return (
                  <g fill="#3B4753">
                    {paredes.celdas.map(([i, j]) => (
                      <rect key={`${i},${j}`} x={X(i * res)} y={Y((j + 1) * res)} width={lado + 0.5} height={lado + 0.5} />
                    ))}
                  </g>
                );
              })()}

              {/* Camino del robot, con flechitas de sentido */}
              {capas.camino && recorrido.length > 1 && (() => {
                const pts = recorrido.map(p => `${X(p.x)},${Y(p.y)}`).join(' ');
                return (
                  <g strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <polyline points={pts} stroke="#FFFFFF" strokeWidth="7" />
                    <polyline points={pts} stroke="#377DC0" strokeWidth="2.75" />
                    {flechas.map((f, i) => (
                      <path key={i} d="M -3.5 -3.5 L 1.5 0 L -3.5 3.5" stroke="#FFFFFF" strokeWidth="1.6"
                        transform={`translate(${X(f.x)} ${Y(f.y)}) rotate(${(-f.ang * 180) / Math.PI})`} />
                    ))}
                  </g>
                );
              })()}
            </g>

            {/* Hallazgos, numerados */}
            {capas.hallazgos && puntos.filter(seVe).map(h => {
              const x = X(Number(h.ubicacion_x));
              const y = Y(Number(h.ubicacion_y));
              if (!dentroX(x) || !dentroY(y)) return null;
              const color = infoDano(h.tipo_dano).color;
              const activo = h.id === selId;
              return (
                <g key={h.id} onMouseDown={e => e.stopPropagation()} onClick={() => { setSelId(h.id); setDetalle(h.id); }} style={{ cursor: 'pointer' }}>
                  {activo && <circle cx={x} cy={y} r="16" fill={color} fillOpacity="0.16" stroke={color} strokeOpacity="0.55" />}
                  <g opacity={estadoDe(h.id) === 'descartado' ? 0.35 : 1}>
                    <circle cx={x} cy={y} r="9.5" fill={estadoDe(h.id) === 'descartado' ? '#8A8C8E' : color} stroke="white" strokeWidth="2" filter="url(#sombraPunto)" />
                    <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="white" fontFamily={FUENTE}>{numero.get(h.id)}</text>
                  </g>
                  {estadoDe(h.id) === 'confirmado' && (
                    <g transform={`translate(${x + 8} ${y - 8})`}>
                      <circle r="5.5" fill="#047857" stroke="white" strokeWidth="1.5" />
                      <path d="M -2.4 0.1 L -0.6 1.9 L 2.6 -1.6" stroke="white" strokeWidth="1.4" fill="none" />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Inicio */}
            {capas.camino && inicio && dentroX(X(inicio.x)) && dentroY(Y(inicio.y)) && (
              <g pointerEvents="none">
                <circle cx={X(inicio.x)} cy={Y(inicio.y)} r="6" fill="#10B981" stroke="white" strokeWidth="2.5" filter="url(#sombraPunto)" />
                <Etiqueta x={X(inicio.x)} y={Y(inicio.y)} texto="Inicio" color="#047857" />
              </g>
            )}

            {/* Robot ahora, o fin del recorrido */}
            {capas.camino && actual && recorrido.length > 1 && dentroX(X(actual.x)) && dentroY(Y(actual.y)) && (
              enCurso ? (
                <g transform={`translate(${X(actual.x)} ${Y(actual.y)})`} pointerEvents="none">
                  <circle r="16" fill="#377DC0" fillOpacity="0.18" className="route-end-pulse" />
                  {actual.yaw != null && (
                    <path d="M 4 -7 L 19 0 L 4 7 Z" fill="#377DC0" stroke="white" strokeWidth="1.5" strokeLinejoin="round"
                      transform={`rotate(${(-actual.yaw * 180) / Math.PI})`} />
                  )}
                  <circle r="8" fill="#377DC0" stroke="white" strokeWidth="2.5" filter="url(#sombraPunto)" />
                  <Etiqueta x={0} y={0} texto="Robot" color="#377DC0" />
                </g>
              ) : (
                <g pointerEvents="none">
                  <rect x={X(actual.x) - 6.5} y={Y(actual.y) - 6.5} width="13" height="13" rx="3" fill="#377DC0" stroke="white" strokeWidth="2.5" filter="url(#sombraPunto)" />
                  <Etiqueta x={X(actual.x)} y={Y(actual.y)} texto="Fin" color="#377DC0" />
                </g>
              )
            )}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center">
            <p className="text-[13px] text-[#8A8C8E]">{mensaje ?? 'Sin posiciones registradas.'}</p>
          </div>
        )}
        </div>

      {/* Zoom: abajo, a la izquierda del panel de hallazgos */}
      <div className={`absolute bottom-3 z-10 flex flex-col rounded-lg ${panelCerrado ? 'right-3' : 'right-[272px] xl:right-[324px]'} bg-white/90 backdrop-blur-sm border border-[#E5E7EB] shadow-[0_4px_16px_rgba(20,32,43,0.10)] overflow-hidden`}>
        {([
          ['Acercar', () => zoomEn(1.3), <path key="m" d="M8 3v10M3 8h10" />],
          ['Alejar', () => zoomEn(1 / 1.3), <path key="m" d="M3 8h10" />],
          ['Ver todo el plano', () => setZoom({ k: 1, dx: 0, dy: 0 }), <path key="t" d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />],
        ] as [string, () => void, React.ReactNode][]).map(([titulo, accion, icono]) => (
          <button key={titulo} type="button" onClick={accion} title={titulo} aria-label={titulo}
            className="w-9 h-9 flex items-center justify-center text-[#424242] hover:bg-black/[0.05] border-b last:border-b-0 border-[#14202B]/[0.06]">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5" fill="none">{icono}</svg>
          </button>
        ))}
      </div>

      {/* Panel de hallazgos: tarjeta que flota sobre el lienzo */}
      {panelCerrado ? (
        <button type="button" onClick={() => setPanelCerrado(false)} title="Ver hallazgos" aria-label="Ver hallazgos"
          className="absolute top-3 right-3 flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-white/90 backdrop-blur-sm border border-[#E5E7EB] shadow-[0_4px_16px_rgba(20,32,43,0.10)] text-[13px] font-semibold text-[#1A1C1E] hover:bg-white">
          Hallazgos
          <span className="h-5 min-w-[22px] px-1.5 rounded-full bg-[#F1F3F5] text-[11px] font-semibold text-[#66686A] flex items-center justify-center tabular-nums">{hallazgos.length}</span>
          <ChevronsLeft className="w-4 h-4 text-[#616161]" />
        </button>
      ) : (
      <aside className="absolute top-3 right-3 bottom-3 w-[260px] xl:w-[300px] flex flex-col rounded-lg bg-white/90 backdrop-blur-sm border border-[#E5E7EB] shadow-[0_4px_16px_rgba(20,32,43,0.10)] overflow-hidden">
        <div className="flex-none flex items-center gap-2 px-4 h-12 border-b border-[#14202B]/[0.06]">
          <h3 className="text-[14px] font-semibold text-[#1A1C1E]">Hallazgos</h3>
          <span className="h-5 min-w-[22px] px-1.5 rounded-full bg-[#F1F3F5] text-[11px] font-semibold text-[#66686A] flex items-center justify-center tabular-nums">
            {hallazgos.length}
          </span>
          <button type="button" onClick={() => setPanelCerrado(true)} title="Ocultar el panel" aria-label="Ocultar el panel"
            className="ml-auto w-[24px] h-[24px] flex items-center justify-center rounded-[4px] text-[#424242] hover:bg-black/[0.06]">
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Revisión */}
          <SeccionPanel titulo="Revisión">
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)}
              className="w-full h-8 px-2.5 mb-2 rounded-md border border-[#D4D4D4] bg-white text-[13px] text-[#1A1C1E] outline-none focus:border-[#377DC0]">
              <option value="todos">Todos los hallazgos</option>
              <option value="pendiente">Solo sin revisar</option>
              <option value="confirmado">Solo confirmados</option>
              <option value="descartado">Solo descartados</option>
            </select>
            {([['pendiente', 'Sin revisar', '#1A1C1E'], ['confirmado', 'Confirmados', '#047857'], ['descartado', 'Descartados', '#66686A']] as const).map(([e, et, color]) => (
              <div key={e} className="flex items-center h-7 text-[13px]">
                <span className="flex-1 text-[#66686A]">{et}</span>
                <span className="font-semibold tabular-nums" style={{ color }}>{hallazgos.filter(h => estadoDe(h.id) === e).length}</span>
              </div>
            ))}
          </SeccionPanel>

          {/* Tipos de daño: se eligen cuáles ver en el plano y se despliegan sus hallazgos */}
          <SeccionPanel titulo="Tipos de daño" accion={porTipo.length > 1 ? (
            <button type="button" onClick={() => setOcultos(o => (o.size ? new Set() : new Set(porTipo.map(p => p.tipo.etiqueta))))}
              className="text-[12px] font-medium text-[#377DC0] hover:underline">
              {ocultos.size ? 'Ver todos' : 'Ocultar todos'}
            </button>
          ) : undefined}>
            {hallazgos.length === 0 && (
              <p className="text-[13px] text-[#8A8C8E]">{enCurso ? 'Todavía no hay hallazgos.' : 'Sin hallazgos.'}</p>
            )}
            <div className="-mx-2">
              {porTipo.map(({ tipo }) => {
                const abierto = abiertos.has(tipo.etiqueta);
                const visible = !ocultos.has(tipo.etiqueta);
                const delTipo = lista.filter(h => infoDano(h.tipo_dano).etiqueta === tipo.etiqueta);
                const filtrados = delTipo.filter(h => filtroEstado === 'todos' || estadoDe(h.id) === filtroEstado);
                return (
                  <div key={tipo.etiqueta}>
                    <div className="flex items-center gap-1 h-8 pl-1 pr-2 rounded-md hover:bg-black/[0.035]">
                      <button type="button" aria-label={abierto ? 'Plegar' : 'Desplegar'}
                        onClick={() => setAbiertos(c => { const x = new Set(c); x.has(tipo.etiqueta) ? x.delete(tipo.etiqueta) : x.add(tipo.etiqueta); return x; })}
                        className="w-5 h-5 flex items-center justify-center text-[#8A8C8E] hover:text-[#1A1C1E]">
                        {abierto ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                        <input type="checkbox" checked={visible} className="sr-only"
                          onChange={() => setOcultos(o => { const x = new Set(o); x.has(tipo.etiqueta) ? x.delete(tipo.etiqueta) : x.add(tipo.etiqueta); return x; })} />
                        <Casilla marcada={visible} color={tipo.color} />
                        <span className={`text-[13px] flex-1 truncate ${visible ? 'text-[#1A1C1E]' : 'text-[#A0A2A4]'}`}>{tipo.etiqueta}</span>
                      </label>
                      <span className="text-[12px] text-[#8A8C8E] tabular-nums">{filtrados.length}</span>
                    </div>
                    {abierto && (
                      <div className="ml-[13px] pl-2 border-l border-[#14202B]/[0.08] mb-1">
                        {filtrados.length === 0 && <p className="h-7 flex items-center pl-2 text-[12px] text-[#A0A2A4]">Ninguno con este filtro</p>}
                        {filtrados.map(h => {
                          const activo = h.id === selId;
                          const pct = h.probabilidad_promedio != null ? Math.round(Number(h.probabilidad_promedio) * 100) : null;
                          return (
                            <button key={h.id} type="button" onClick={() => { setSelId(h.id); setDetalle(h.id); }}
                              aria-current={activo ? 'true' : undefined}
                              className={`w-full flex items-center gap-2 h-7 pl-2 pr-2 rounded-md text-left ${activo ? 'bg-[#E3EEF8]' : 'hover:bg-black/[0.035]'}`}>
                              <span className="w-[18px] h-[18px] rounded-full flex-none flex items-center justify-center text-[10px] font-bold text-white tabular-nums" style={{ background: tipo.color }}>
                                {numero.get(h.id)}
                              </span>
                              <span className={`text-[13px] flex-1 truncate ${estadoDe(h.id) === 'descartado' ? 'text-[#A0A2A4] line-through' : 'text-[#1A1C1E]'}`}>Hallazgo {numero.get(h.id)}</span>
                              {estadoDe(h.id) === 'confirmado' && <Check className="w-3.5 h-3.5 text-[#047857] flex-none" aria-label="Confirmado" />}
                              {estadoDe(h.id) === 'descartado' && <Cruz className="w-3.5 h-3.5 text-[#A0A2A4] flex-none" aria-label="Descartado" />}
                              {pct !== null && <span className="w-9 text-right text-[12px] text-[#66686A] tabular-nums">{pct}%</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SeccionPanel>

          {/* Capas del plano */}
          <SeccionPanel titulo="Capas del plano">
            {([['paredes', 'Paredes'], ['camino', 'Recorrido del robot'], ['hallazgos', 'Hallazgos']] as [keyof Capas, string][]).map(([c, et]) => (
              <label key={c} className="flex items-center gap-2 h-7 cursor-pointer">
                <input type="checkbox" checked={capas[c]} className="sr-only" onChange={() => setCapas(x => ({ ...x, [c]: !x[c] }))} />
                <Casilla marcada={capas[c]} color="#377DC0" />
                <span className={`text-[13px] ${capas[c] ? 'text-[#1A1C1E]' : 'text-[#A0A2A4]'}`}>{et}</span>
              </label>
            ))}
          </SeccionPanel>
        </div>
      </aside>
      )}
      </div>

      {/* Detalle del hallazgo elegido */}
      {detalle !== null && (() => {
        const h = hallazgos.find(x => x.id === detalle);
        if (!h) return null;
        return (
          <DetalleDeteccion
            key={h.id}
            onCerrar={() => setDetalle(null)}
            revision={revisiones.get(h.id) ?? null}
            onGuardarRevision={rev => guardarRevision(h.id, rev)}
            d={{
              id: h.id,
              numero: numero.get(h.id) ?? 0,
              tipo: h.tipo_dano,
              probabilidad: h.probabilidad_promedio != null ? Number(h.probabilidad_promedio) : null,
              x: h.ubicacion_x != null ? Number(h.ubicacion_x) : null,
              y: h.ubicacion_y != null ? Number(h.ubicacion_y) : null,
              fecha: h.fecha_deteccion,
              foto: h.imagen_representativa_url ? (h.id === selId ? foto : undefined) : null,
            }}
          />
        );
      })()}
    </div>
  );
}

/** Bloque del panel de hallazgos: título chico arriba y su contenido. */
function SeccionPanel({ titulo, accion, children }: { titulo: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="px-4 py-3.5 border-b border-[#14202B]/[0.06] last:border-b-0">
      <div className="flex items-center mb-2">
        <h4 className="flex-1 text-[12px] font-semibold text-[#66686A]">{titulo}</h4>
        {accion}
      </div>
      {children}
    </section>
  );
}

/** Casilla de verificación cuadrada, pintada del color del tipo de daño. */
function Casilla({ marcada, color }: { marcada: boolean; color: string }) {
  return (
    <span className="w-3.5 h-3.5 flex-none rounded-[3px] border flex items-center justify-center"
      style={marcada ? { background: color, borderColor: color } : { borderColor: '#A0A2A4', background: 'white' }}>
      {marcada && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M2 5.2 4.2 7.4 8 3" stroke="white" strokeWidth="1.6" fill="none" /></svg>}
    </span>
  );
}


/** Cartelito blanco con texto de color, arriba a la derecha de un punto del mapa. */
function Etiqueta({ x, y, texto, color }: { x: number; y: number; texto: string; color: string }) {
  const ancho = texto.length * 6.2 + 14;
  return (
    <g transform={`translate(${x + 10} ${y - 26})`} pointerEvents="none">
      <rect width={ancho} height="18" rx="3" fill="#FFFFFF" stroke="#D4D4D4" />
      <text x={ancho / 2} y="12.5" textAnchor="middle" fontSize="10.5" fontWeight="600" fill={color} fontFamily="IBM Plex Sans, sans-serif">{texto}</text>
    </g>
  );
}
