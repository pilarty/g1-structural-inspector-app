import React from 'react';
import { LayoutDashboard, Building2, ScanLine, Users, ClipboardList, Settings } from 'lucide-react';

export type NavTab = 'dashboard' | 'edificios' | 'relevamiento' | 'inspeccion' | 'equipo' | 'nuevo-edificio' | 'building-empty' | 'inspeccion-en-curso' | 'recorrido';

const navItems: { id: NavTab; Icon: React.ElementType }[] = [
  { id: 'dashboard',   Icon: LayoutDashboard },
  { id: 'edificios',   Icon: Building2 },
  { id: 'relevamiento', Icon: ScanLine },
  { id: 'inspeccion',  Icon: ClipboardList },
  { id: 'equipo',      Icon: Users },
];

interface ActivityBarProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

export default function ActivityBar({ active, onChange }: ActivityBarProps) {
  return (
    <div className="flex-none w-[58px] h-full bg-[#0D5254] flex flex-col items-center pt-2 z-30">
      {navItems.map(({ id, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`relative w-full flex items-center justify-center h-12 transition-colors ${
              isActive ? 'text-white' : 'text-white/35 hover:text-white/70'
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] bg-white rounded-r-full" />
            )}
            {isActive && (
              <span className="absolute inset-x-3 inset-y-1.5 bg-white/[0.12] rounded-lg" />
            )}
            <Icon className="w-[18px] h-[18px] relative z-10" />
          </button>
        );
      })}

      <div className="flex-1" />
      <div className="w-8 h-px bg-white/10 mb-2" />
      <button className="w-full flex items-center justify-center h-12 text-white/35 hover:text-white/70 transition-colors mb-1">
        <Settings className="w-[18px] h-[18px]" />
      </button>
    </div>
  );
}
