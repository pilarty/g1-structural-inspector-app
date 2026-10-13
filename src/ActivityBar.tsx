import React from 'react';
import { List, LayoutGrid, ScanLine, ClipboardList, Settings, FolderPlus, Bot } from 'lucide-react';

export type NavTab = 'dashboard' | 'edificios' | 'relevamiento' | 'inspeccion' | 'equipo' | 'nuevo-edificio' | 'nuevo-proyecto' | 'nuevo-robot' | 'building-empty' | 'inspeccion-en-curso' | 'recorrido';

const navItems: { id: NavTab; Icon: React.ElementType; label: string }[] = [
  { id: 'edificios',   Icon: List,             label: 'Índice' },
  { id: 'dashboard',   Icon: LayoutGrid,       label: 'Dashboard' },
  { id: 'relevamiento', Icon: ClipboardList,   label: 'Relevamiento' },
  { id: 'inspeccion',  Icon: ScanLine,         label: 'Iniciar inspección' },
];

const actionItems: { id: NavTab; Icon: React.ElementType; label: string }[] = [
  { id: 'nuevo-proyecto', Icon: FolderPlus, label: 'Nuevo proyecto' },
  { id: 'nuevo-robot',    Icon: Bot,        label: 'Robot' },
];

interface ActivityBarProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

function RailButton({ id, Icon, label, isActive, onClick }: { id: NavTab; Icon: React.ElementType; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      key={id}
      onClick={onClick}
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
      <Icon size={22} className="relative z-10" />
      <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1A1C1E] text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-40">
        {label}
      </span>
    </button>
  );
}

export default function ActivityBar({ active, onChange }: ActivityBarProps) {
  return (
    <div className="flex-none w-[58px] h-full bg-[#14202B] flex flex-col items-center pt-2 z-30">
      {navItems.map(item => (
        <RailButton key={item.id} {...item} isActive={active === item.id} onClick={() => onChange(item.id)} />
      ))}

      <div className="flex-1" />

      {actionItems.map(item => (
        <RailButton key={item.id} {...item} isActive={active === item.id} onClick={() => onChange(item.id)} />
      ))}

      <button className="group relative w-full flex items-center justify-center h-12 text-white/35 hover:text-white/70 transition-colors mb-1">
        <Settings size={22} />
        <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1A1C1E] text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-40">
          Configuración
        </span>
      </button>
    </div>
  );
}
