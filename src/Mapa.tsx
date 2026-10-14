import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, ChevronRight, MapPin, MapPinOff } from 'lucide-react';
import { useProyectos } from './proyectos';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton } from './components';
import SeverityBadge from './components/SeverityBadge';
import { severity } from './tokens';
import type { Building, SeverityLevel } from './data';

interface MapaProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  /** Abrir una edificación (su última inspección) */
  onAbrir: (edificioId: string) => void;
  /** Completar la dirección de una edificación sin ubicar */
  onEditar: (edificioId: string) => void;
}

type Item = Building & { proyecto: string };

const SIN_INSPECCION = '#8A8C8E';
const NIVELES: SeverityLevel[] = ['critical', 'high', 'medium', 'low'];

const colorDe = (b: Building) =>
  b.relevamientos === 0 ? SIN_INSPECCION : b.lastDetections === 0 ? '#377DC0' : severity[b.highestSeverity].dot;

/** Las edificaciones en un mapa, con el color de su última inspección. */
export default function Mapa({ activeTab, onTabChange, onAbrir, onEditar }: MapaProps) {
  const { proyectos, recargar } = useProyectos();
  const [elegido, setElegido] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capa = useRef<L.LayerGroup | null>(null);
  const marcadores = useRef(new Map<string, L.CircleMarker>());

  useEffect(() => { recargar(); }, [recargar]);

  const todos: Item[] = useMemo(
    () => proyectos.flatMap(p => p.buildings.map(b => ({ ...b, proyecto: p.name }))), [proyectos]);
  const ubicados = todos.filter(b => b.lat !== undefined && b.lon !== undefined && !isNaN(b.lat) && !isNaN(b.lon));
  const sinUbicar = todos.filter(b => !ubicados.includes(b));
  const actual = todos.find(b => b.id === elegido) ?? null;

  // Crear el mapa una sola vez (centrado en Argentina)
  useEffect(() => {
    if (!caja.current || mapa.current) return;
    const m = L.map(caja.current, { zoomControl: false, attributionControl: true }).setView([-38.4, -63.6], 4);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.attributionControl.setPrefix(false);
    capa.current = L.layerGroup().addTo(m);
    mapa.current = m;
    // Si cambia el tamaño de la ventana, el mapa se reacomoda
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(caja.current);
    return () => { ro.disconnect(); m.remove(); mapa.current = null; };
  }, []);

  // Dibujar los marcadores cada vez que cambian los datos
  const clave = ubicados.map(b => `${b.id}:${b.lat}:${b.lon}:${colorDe(b)}`).join('|');
  useEffect(() => {
    const m = mapa.current, g = capa.current;
    if (!m || !g) return;
    g.clearLayers();
    marcadores.current.clear();
    for (const b of ubicados) {
      const mk = L.circleMarker([b.lat!, b.lon!], {
        radius: 9, weight: 3, color: '#FFFFFF', fillColor: colorDe(b), fillOpacity: 1,
      }).bindTooltip(b.name, { direction: 'top', offset: [0, -8] })
        .on('click', () => setElegido(b.id))
        .addTo(g);
      marcadores.current.set(b.id, mk);
    }
    if (ubicados.length === 1) m.setView([ubicados[0].lat!, ubicados[0].lon!], 14);
    else if (ubicados.length > 1) m.fitBounds(L.latLngBounds(ubicados.map(b => [b.lat!, b.lon!])), { padding: [60, 60], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // Resaltar la elegida
  useEffect(() => {
    marcadores.current.forEach((mk, id) => mk.setStyle({ radius: id === elegido ? 13 : 9, color: id === elegido ? '#14202B' : '#FFFFFF' }));
    const mk = elegido ? marcadores.current.get(elegido) : undefined;
    if (mk) { mk.bringToFront(); mapa.current?.panTo(mk.getLatLng()); }
  }, [elegido, clave]);

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <div className="flex flex-1 overflow-hidden">

          {/* Lista */}
          <aside className="flex-none w-[320px] bg-white border-r border-[#14202B]/[0.07] flex flex-col overflow-hidden">
            <div className="px-5 pt-6 pb-4 border-b border-[#14202B]/[0.06]">
              <h1 className="text-[20px] font-bold tracking-tight">Mapa</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-0.5">
                {ubicados.length} de {todos.length} edificaci{todos.length === 1 ? 'ón' : 'ones'} en el mapa
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ul className="py-2">
                {ubicados.map(b => (
                  <li key={b.id}>
                    <button type="button" onClick={() => setElegido(b.id)}
                      className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${b.id === elegido ? 'bg-[#E3EEF8]' : 'hover:bg-[#F8FAFC]'}`}>
                      <span className="flex-none w-3 h-3 rounded-full ring-2 ring-white shadow" style={{ backgroundColor: colorDe(b) }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold truncate">{b.name}</span>
                        <span className="block text-[12px] text-[#8A8C8E] truncate">{b.proyecto}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {sinUbicar.length > 0 && (
                <div className="border-t border-[#14202B]/[0.06] py-2">
                  <p className="px-5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8A8C8E]">Sin ubicar</p>
                  {sinUbicar.map(b => (
                    <button key={b.id} type="button" onClick={() => onEditar(b.id)} title="Completar la dirección"
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-[#F8FAFC] transition-colors">
                      <MapPinOff className="flex-none w-4 h-4 text-[#A0A2A4]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-[#66686A] truncate">{b.name}</span>
                        <span className="block text-[12px] text-[#8A8C8E] truncate">Completar la dirección</span>
                      </span>
                      <ChevronRight className="flex-none w-4 h-4 text-[#A0A2A4]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Mapa */}
          <div className="relative flex-1">
            <div ref={caja} className="absolute inset-0 z-0" />

            {/* Referencias */}
            <div className="absolute top-4 right-4 z-[500] bg-white/95 rounded-xl shadow-[0_4px_16px_rgba(20,32,43,0.12)] px-4 py-3 text-[12px]">
              <p className="font-semibold text-[#1A1C1E] mb-1.5">Última inspección</p>
              {NIVELES.map(n => (
                <p key={n} className="flex items-center gap-2 py-0.5 text-[#66686A]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: severity[n].dot }} />{severity[n].label}
                </p>
              ))}
              <p className="flex items-center gap-2 py-0.5 text-[#66686A]"><span className="w-2.5 h-2.5 rounded-full bg-[#377DC0]" />Sin hallazgos</p>
              <p className="flex items-center gap-2 py-0.5 text-[#66686A]"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SIN_INSPECCION }} />Sin inspeccionar</p>
            </div>

            {/* Edificación elegida */}
            {actual && (
              <div className="absolute left-4 bottom-4 z-[500] w-[360px] bg-white rounded-2xl shadow-[0_8px_32px_rgba(20,32,43,0.18)] p-5">
                <div className="flex items-start gap-3">
                  <span className="flex-none w-10 h-10 rounded-xl bg-[#E3EEF8] text-[#377DC0] flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold truncate">{actual.name}</p>
                    <p className="text-[12px] text-[#8A8C8E] truncate">{actual.proyecto}</p>
                  </div>
                  <button type="button" onClick={() => setElegido(null)} aria-label="Cerrar"
                    className="flex-none text-[#A0A2A4] hover:text-[#1A1C1E] text-[20px] leading-none">×</button>
                </div>
                <p className="flex items-start gap-1.5 mt-3 text-[13px] text-[#66686A]">
                  <MapPin className="w-4 h-4 flex-none mt-0.5 text-[#377DC0]" />{actual.address || 'Sin dirección'}
                </p>
                <div className="flex items-center gap-2 mt-3 text-[13px]">
                  {actual.relevamientos === 0 ? (
                    <span className="text-[#8A8C8E]">Todavía no se inspeccionó</span>
                  ) : (
                    <>
                      <span className="text-[#66686A]">Última: <b className="text-[#1A1C1E]">{actual.lastRelevamientoDate}</b></span>
                      {actual.lastDetections > 0
                        ? <SeverityBadge level={actual.highestSeverity} count={actual.lastDetections} />
                        : <span className="text-[12px] font-semibold text-[#15803D]">Sin hallazgos</span>}
                    </>
                  )}
                </div>
                <div className="mt-4">
                  <PrimaryButton onClick={() => onAbrir(actual.id)} icon={<ChevronRight className="w-4 h-4" />}>Abrir edificación</PrimaryButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
