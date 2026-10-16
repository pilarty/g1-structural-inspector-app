import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, ChevronRight, Folder, MapPin, MapPinOff, Search, X } from 'lucide-react';
import { useProyectos } from './proyectos';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton } from './components';
import type { Building } from './data';

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

const CON_DANOS = '#EA580C';
const SIN_DANOS = '#16A34A';
// Color por la última inspección: con daños, sin daños o sin inspeccionar
const colorDe = (b: Building) =>
  b.relevamientos === 0 ? SIN_INSPECCION : b.lastDetections === 0 ? SIN_DANOS : CON_DANOS;

/** Las edificaciones en un mapa, con el color de su última inspección. */
export default function Mapa({ activeTab, onTabChange, onAbrir, onEditar }: MapaProps) {
  const { proyectos, recargar } = useProyectos();
  const [elegido, setElegido] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
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

          {/* Lista (mismo estilo que el panel de proyectos) */}
          <aside className="flex-none w-[300px] bg-[#F8F9FA] border-r border-[#E5E7EB] flex flex-col overflow-hidden">
            <div className="flex-none bg-white border-b border-[#E5E7EB] px-4 pt-4 pb-3.5">
              <div className="flex items-center gap-2">
                <h1 className="text-[16px] font-semibold text-[#1A1C1E] tracking-[-0.01em]">Mapa</h1>
                <span className="h-5 px-1.5 rounded-full bg-[#F1F3F5] text-[11px] font-semibold text-[#66686A] flex items-center tabular-nums">
                  {ubicados.length} de {todos.length}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 h-9 px-2.5 bg-white rounded-[3px] border border-[#D4D4D4] focus-within:border-[#377DC0] focus-within:outline focus-within:outline-1 focus-within:outline-[#377DC0]">
                <Search className="w-4 h-4 text-[#8A8C8E] flex-none" />
                <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar"
                  className="bg-transparent text-[14px] text-[#1A1C1E] placeholder:text-[#8A8C8E] outline-none w-full min-w-0" />
                {texto && (
                  <button type="button" onClick={() => setTexto('')} aria-label="Borrar búsqueda" className="flex-none text-[#8A8C8E] hover:text-[#1A1C1E]">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-2 pb-2">
              {proyectos.map(p => {
                const q = texto.trim().toLowerCase();
                const suyos = ubicados.filter(b => b.proyecto === p.name &&
                  (!q || b.name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)));
                if (suyos.length === 0) return null;
                return (
                  <div key={p.id}>
                    <div className="flex items-center gap-1.5 h-[32px] pl-3 pr-3">
                      <Folder className="w-4 h-4 flex-none text-[#C09553]" />
                      <span className="text-[14px] flex-1 truncate text-[#1A1C1E]">{p.name}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-[20px] top-0 bottom-0 w-px bg-black/[0.12] pointer-events-none" />
                      {suyos.map(b => (
                        <button key={b.id} type="button" onClick={() => setElegido(b.id)}
                          aria-current={b.id === elegido ? 'true' : undefined}
                          className={`w-full flex items-center gap-1.5 h-[32px] pl-[34px] pr-3 text-left ${
                            b.id === elegido ? 'bg-[#D6E6F5] outline outline-1 -outline-offset-1 outline-[#377DC0]' : 'hover:bg-black/[0.045]'
                          }`}>
                          <Building2 className="w-4 h-4 flex-none text-[#377DC0]" />
                          <span className="text-[14px] truncate min-w-0 flex-1 text-[#1A1C1E]">{b.name}</span>
                          <span className="flex-none w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorDe(b) }} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {ubicados.length === 0 && (
                <p className="px-4 py-2 text-[13px] text-[#8A8C8E]">Ninguna edificación tiene la dirección ubicada todavía.</p>
              )}

              {sinUbicar.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                  <p className="px-4 pb-1 text-[12px] font-semibold text-[#616161]">Sin ubicar · {sinUbicar.length}</p>
                  {sinUbicar.map(b => (
                    <button key={b.id} type="button" onClick={() => onEditar(b.id)} title="Completar la dirección"
                      className="group w-full flex items-center gap-1.5 h-[32px] pl-3 pr-3 text-left hover:bg-black/[0.045]">
                      <MapPinOff className="flex-none w-4 h-4 text-[#A0A2A4]" />
                      <span className="text-[14px] truncate min-w-0 flex-1 text-[#66686A]">{b.name}</span>
                      <span className="flex-none text-[12px] text-[#377DC0] opacity-0 group-hover:opacity-100">Completar</span>
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
            <div className="absolute top-4 right-4 z-[500] bg-white rounded-lg border border-[#D4D4D4] shadow-[0_2px_8px_rgba(20,32,43,0.10)] px-4 py-3 text-[13px]">
              <p className="text-[12px] font-semibold text-[#616161] mb-1.5">Última inspección</p>
              <p className="flex items-center gap-2 py-0.5 text-[#1A1C1E]"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CON_DANOS }} />Con daños encontrados</p>
              <p className="flex items-center gap-2 py-0.5 text-[#1A1C1E]"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SIN_DANOS }} />Sin daños</p>
              <p className="flex items-center gap-2 py-0.5 text-[#1A1C1E]"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SIN_INSPECCION }} />Sin inspeccionar</p>
            </div>

            {/* Edificación elegida */}
            {actual && (
              <div className="absolute left-4 bottom-4 z-[500] w-[360px] bg-white rounded-lg border border-[#D4D4D4] shadow-[0_8px_24px_rgba(20,32,43,0.16)] overflow-hidden">
                <div className="flex items-start gap-3 px-5 pt-4 pb-3">
                  <Building2 className="w-5 h-5 flex-none mt-0.5 text-[#377DC0]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold text-[#1A1C1E] truncate">{actual.name}</p>
                    <p className="text-[12px] text-[#8A8C8E] truncate">
                      {actual.proyecto}
                    </p>
                  </div>
                  <button type="button" onClick={() => setElegido(null)} aria-label="Cerrar"
                    className="flex-none w-7 h-7 -mr-1.5 flex items-center justify-center rounded-[4px] text-[#616161] hover:bg-black/[0.06]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  <p className="flex items-start gap-1.5 text-[13px] text-[#66686A]">
                    <MapPin className="w-4 h-4 flex-none mt-0.5 text-[#8A8C8E]" />{actual.address || 'Sin dirección'}
                  </p>
                  <div className="flex items-center gap-2 text-[13px]">
                    {actual.relevamientos === 0 ? (
                      <span className="text-[#8A8C8E]">Todavía no se inspeccionó</span>
                    ) : (
                      <>
                        <span className="text-[#66686A]">Última inspección: <b className="font-semibold text-[#1A1C1E]">{actual.lastRelevamientoDate}</b></span>
                        {actual.lastDetections > 0
                          ? <span className="text-[12px] font-semibold" style={{ color: CON_DANOS }}>{actual.lastDetections} hallazgo{actual.lastDetections === 1 ? '' : 's'}</span>
                          : <span className="text-[12px] font-semibold" style={{ color: SIN_DANOS }}>Sin hallazgos</span>}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-end px-5 py-3 bg-[#F8F9FA] border-t border-[#E5E7EB]">
                  <PrimaryButton onClick={() => onAbrir(actual.id)} iconRight={<ChevronRight className="w-4 h-4" />}>Abrir edificación</PrimaryButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
