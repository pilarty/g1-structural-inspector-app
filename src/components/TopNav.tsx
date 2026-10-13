import React from 'react';
import { Bell, User, ChevronDown, LogOut } from 'lucide-react';
import { useSesion } from '../sesion';
import ParadaEmergencia from './ParadaEmergencia';

interface TopNavProps {
  /**
   * Optional element rendered after the app title — e.g. a status badge or
   * building name chip. Pass null/undefined to render the title alone.
   */
  badge?: React.ReactNode;
}

/**
 * App-wide top navigation bar. Fixed at h-12, navy background (matches ActivityBar),
 * shows app title + optional badge on the left and notification + user avatar on the right.
 */
export default function TopNav({ badge }: TopNavProps) {
  const { usuario, cerrar } = useSesion();
  return (
    <nav className="flex-none h-12 bg-[#14202B] flex items-center justify-between px-6 z-20 border-b border-white/5">
      {/* Left — optional badge */}
      <div className="flex items-center min-w-0">
        {badge}
      </div>

      {/* Right — notifications + user */}
      <div className="flex items-center gap-1 flex-none">
        <div className="mr-3">
          <ParadaEmergencia />
        </div>
        <button
          aria-label="Notificaciones"
          className="p-2 text-white/55 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={cerrar}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="p-2 text-white/55 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <button className="ml-1 flex items-center gap-2 px-2.5 py-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[12px] font-medium max-w-[180px] truncate">{usuario}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-55" />
        </button>
      </div>
    </nav>
  );
}
