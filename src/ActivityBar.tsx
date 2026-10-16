import React, { useEffect, useState } from 'react';
import { FolderPlus, House, ScanLine, Bot, ClipboardList, Map as MapIcon } from 'lucide-react';
import { consultarActivo } from './robotConexion';
import ParadaEmergencia from './components/ParadaEmergencia';
import { MenuUsuario } from './components/TopNav';

export type NavTab = 'dashboard' | 'edificios' | 'relevamiento' | 'inspeccion' | 'equipo' | 'nuevo-edificio' | 'nuevo-proyecto' | 'nuevo-robot' | 'building-empty' | 'inspeccion-en-curso' | 'recorrido' | 'ficha-edificio' | 'editar-edificio' | 'editar-proyecto' | 'ficha-proyecto' | 'inspecciones' | 'mapa';

const navItems: { id: NavTab; Icon: React.ElementType; label: string }[] = [
  { id: 'dashboard',   Icon: House,            label: 'Inicio' },
  { id: 'inspecciones', Icon: ClipboardList,   label: 'Inspecciones' },
  { id: 'mapa',        Icon: MapIcon,          label: 'Mapa' },
  { id: 'inspeccion',  Icon: ScanLine,         label: 'Iniciar inspección' },
];

const actionItems: { id: NavTab; Icon: React.ElementType; label: string }[] = [
  { id: 'nuevo-proyecto', Icon: FolderPlus, label: 'Añadir proyecto' },
  { id: 'nuevo-robot',    Icon: Bot,        label: 'Robot' },
];

interface ActivityBarProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

function RailButton({ id, Icon, label, isActive, onClick, punto }: { id: NavTab; Icon: React.ElementType; label: string; isActive: boolean; onClick: () => void; punto?: 'verde' | 'gris' }) {
  return (
    <button
      key={id}
      onClick={onClick}
      className={`group relative w-full flex items-center justify-center h-14 transition-colors ${
        isActive ? 'text-white' : 'text-white/35 hover:text-white/70'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[3px] bg-white rounded-r-full" />
      )}
      {isActive && (
        <span className="absolute inset-x-3.5 inset-y-1.5 bg-white/[0.12] rounded-xl" />
      )}
      <Icon size={26} className="relative z-10" />
      {punto && (
        <span className={`absolute z-20 top-3 right-[18px] w-3 h-3 rounded-full ring-2 ring-[#14202B] ${punto === 'verde' ? 'bg-[#22C55E]' : 'bg-[#6B7280]'}`} />
      )}
      <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1A1C1E] text-white text-[13px] font-medium px-3 py-2 rounded-lg shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-40">
        {label}
      </span>
    </button>
  );
}

/** Si hay un robot conectado en el backend local (se consulta cada 5 s). */
function useRobotConectado() {
  const [conectado, setConectado] = useState<{ si: boolean; codigo?: string | null }>({ si: false });
  useEffect(() => {
    let vivo = true;
    const mirar = () => consultarActivo()
      .then(r => vivo && setConectado({ si: r.conectado, codigo: r.codigo }))
      .catch(() => vivo && setConectado({ si: false }));
    mirar();
    const t = setInterval(mirar, 5000);
    return () => { vivo = false; clearInterval(t); };
  }, []);
  return conectado;
}

export default function ActivityBar({ active: pantalla, onChange }: ActivityBarProps) {
  const robot = useRobotConectado();
  // El detalle de un relevamiento se abre desde el dashboard («Ver relevamiento»): se marca el dashboard
  const active: NavTab = pantalla === 'relevamiento' ? 'dashboard' : pantalla;
  return (
    <div className="flex-none w-[72px] h-full bg-[#14202B] flex flex-col items-center pt-2 z-30">
      {/* Parada de emergencia: siempre arriba y a la vista */}
      <ParadaEmergencia compacto />
      <div className="w-8 h-px bg-white/10 my-2" />
      {navItems.map(item => (
        <RailButton key={item.id} {...item} isActive={active === item.id} onClick={() => onChange(item.id)} />
      ))}

      <div className="flex-1" />

      {actionItems.map(item => (
        <RailButton key={item.id} {...item} isActive={active === item.id} onClick={() => onChange(item.id)}
          {...(item.id === 'nuevo-robot' ? {
            punto: robot.si ? 'verde' as const : 'gris' as const,
            label: robot.si ? `Robot conectado${robot.codigo ? ` · ${robot.codigo}` : ''}` : 'Robot · sin conectar',
          } : {})} />
      ))}

      <MenuUsuario />
    </div>
  );
}
