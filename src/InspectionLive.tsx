import { useEffect, useState } from 'react';
import { Loader2, Square } from 'lucide-react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, SecondaryButton } from './components';
import MapaHallazgos from './MapaHallazgos';
import { BACKEND_URL } from './sesion';
import { useProyectos } from './proyectos';
import { consultarActivo } from './robotConexion';
import { aDate, horaLocal } from './formato';

interface InspectionLiveProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  /** Al detener: se abre el recorrido de la edificación inspeccionada */
  onStop: (edificioId: string | null) => void;
}

const reloj = (seg: number) =>
  [Math.floor(seg / 3600), Math.floor((seg % 3600) / 60), seg % 60].map(n => String(n).padStart(2, '0')).join(':');

/** La inspección que está corriendo ahora: tiempo, robot y el camino en vivo. */
export default function InspectionLive({ activeTab, onTabChange, onStop }: InspectionLiveProps) {
  const { proyectos, recargar } = useProyectos();
  const [rid, setRid] = useState<number | null | undefined>(undefined); // undefined = cargando
  const [robotConectado, setRobotConectado] = useState<string | null>(null);
  const [ahora, setAhora] = useState(Date.now());
  const [deteniendo, setDeteniendo] = useState(false);

  // Qué inspección está en curso (la sabe el backend local) y si el robot sigue conectado
  useEffect(() => {
    let vivo = true;
    const mirar = () => {
      fetch(`${BACKEND_URL}/nube/estado`).then(r => r.json()).then(d => vivo && setRid(d.relevamiento_id ?? null)).catch(() => vivo && setRid(null));
      consultarActivo().then(a => vivo && setRobotConectado(a.conectado ? a.codigo ?? 'robot' : null)).catch(() => vivo && setRobotConectado(null));
    };
    mirar();
    const t = setInterval(mirar, 3000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Datos de la inspección (edificación, robot, inicio) desde la lista de proyectos
  const encontrada = rid
    ? proyectos.flatMap(p => p.buildings.flatMap(b => b.historial
        .filter(h => h.id === rid)
        .map(h => ({ h, edificio: b, proyecto: p.name }))))[0]
    : undefined;
  useEffect(() => {
    if (!rid || encontrada) return;
    recargar(); // la inspección recién creada todavía no está en la lista
    const t = setInterval(recargar, 4000);
    return () => clearInterval(t);
  }, [rid, !!encontrada, recargar]);

  const inicio = aDate(encontrada?.h.inicio);
  const transcurrido = inicio ? Math.max(0, Math.floor((ahora - inicio.getTime()) / 1000)) : null;

  async function detener() {
    setDeteniendo(true);
    try {
      await fetch(`${BACKEND_URL}/nube/relevamientos/detener`, { method: 'POST' });
    } catch {
      // si falla la nube, igual salimos de la pantalla
    }
    await recargar();
    onStop(encontrada?.edificio.id ?? null);
  }

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />

        {rid === undefined ? (
          <div className="flex-1 flex items-center justify-center text-[14px] text-[#8A8C8E] gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Buscando la inspección en curso…
          </div>
        ) : rid === null ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 bg-[#F3F6F9]">
            <div>
              <p className="text-[18px] font-bold text-[#1A1C1E]">No hay ninguna inspección en curso</p>
              <p className="text-[14px] text-[#8A8C8E] mt-1">Elegí una edificación y un robot para empezar una.</p>
            </div>
            <SecondaryButton onClick={() => onTabChange('inspeccion')}>Iniciar inspección</SecondaryButton>
          </div>
        ) : (
          <>
            {/* Encabezado con los datos reales */}
            <div className="flex-none bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center gap-8">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-[#047857]">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" /> Inspección en curso
                </p>
                <p className="text-[18px] font-bold text-[#1A1C1E] truncate mt-0.5">{encontrada?.edificio.name ?? 'Cargando…'}</p>
                <p className="text-[12px] text-[#8A8C8E] truncate">{encontrada?.proyecto ?? ' '}</p>
              </div>
              <Dato etiqueta="Tiempo transcurrido" valor={transcurrido !== null ? reloj(transcurrido) : '—'} sub={inicio ? `desde las ${horaLocal(encontrada?.h.inicio)}` : ' '} />
              <Dato etiqueta="Robot" valor={encontrada?.h.robot ?? '—'}
                sub={robotConectado ? 'Conectado' : 'Sin conexión directa'} tono={robotConectado ? 'ok' : undefined} />
              <button type="button" onClick={detener} disabled={deteniendo}
                className="flex-none flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium transition-colors bg-white text-[#B91C1C] border border-[#D4D4D4] hover:bg-[#FEF2F2] hover:border-[#FCA5A5] disabled:opacity-50">
                {deteniendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                {deteniendo ? 'Deteniendo…' : 'Detener inspección'}
              </button>
            </div>

            {/* Camino del robot y hallazgos, en vivo */}
            <div className="flex-1 relative overflow-hidden bg-white">
              <MapaHallazgos relevamientoId={rid} enCurso />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, sub, tono }: { etiqueta: string; valor: string; sub: string; tono?: 'ok' }) {
  return (
    <div className="flex-none pl-8 border-l border-[#E5E7EB]">
      <p className="text-[12px] text-[#8A8C8E]">{etiqueta}</p>
      <p className="text-[18px] font-semibold text-[#1A1C1E] tabular-nums leading-tight mt-0.5">{valor}</p>
      <p className={`text-[12px] ${tono === 'ok' ? 'text-[#047857]' : 'text-[#8A8C8E]'}`}>{sub}</p>
    </div>
  );
}
