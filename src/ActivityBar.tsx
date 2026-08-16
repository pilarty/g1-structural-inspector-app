import React from 'react';
import { ListBullets, Buildings, Scan, ClipboardText, GearSix } from '@phosphor-icons/react';

export type NavTab = 'dashboard' | 'edificios' | 'relevamiento' | 'inspeccion' | 'equipo' | 'nuevo-edificio' | 'building-empty' | 'inspeccion-en-curso' | 'recorrido';

const navItems: { id: NavTab; Icon: React.ElementType; label: string }[] = [
  { id: 'edificios',   Icon: ListBullets,   label: 'Índice' },
  { id: 'dashboard',   Icon: Buildings,     label: 'Dashboard' },
  { id: 'relevamiento', Icon: ClipboardText, label: 'Relevamiento' },
  { id: 'inspeccion',  Icon: Scan,          label: 'Iniciar inspección' },
];

interface ActivityBarProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

export default function ActivityBar({ active, onChange }: ActivityBarProps) {
  return (
    <div className="flex-none w-[58px] h-full bg-[#0D5254] flex flex-col items-center pt-2 z-30">
      {navItems.map(({ id, Icon, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`group relative w-full flex items-center justify-center h-12 transition-colors ${
              isActive ? 'text-white' : 'text-white/35 hover:text-white/70'
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] bg-white rounded-r-full" />
            )}
            {isActive && (
              <span className="absolute inset-x-3 inset-y-1.5 bg-white/[0.12] rounded-lg" />
            )}
            <Icon size={24} weight={isActive ? 'fill' : 'regular'} className="relative z-10" />
            <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1A1C1E] text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-40">
              {label}
            </span>
          </button>
        );
      })}

      <div className="flex-1" />
      <button className="group relative w-full flex items-center justify-center h-12 text-white/35 hover:text-white/70 transition-colors mb-1">
        <GearSix size={24} />
        <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1A1C1E] text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-40">
          Configuración
        </span>
      </button>
    </div>
  );
}
