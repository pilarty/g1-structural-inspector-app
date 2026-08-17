import React from 'react';
import { Building2, Bell, User, ChevronDown } from 'lucide-react';

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
  return (
    <nav className="flex-none h-12 bg-[#10141A] flex items-center justify-between px-6 z-20 border-b border-white/5">
      {/* Left — app identity + optional badge */}
      <div className="flex items-center min-w-0">
        <div className="flex items-center gap-2 text-white flex-none">

        </div>
        {badge}
      </div>

      {/* Right — notifications + user */}
      <div className="flex items-center gap-1 flex-none">
        <button
          aria-label="Notificaciones"
          className="p-2 text-white/55 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button className="ml-1 flex items-center gap-2 px-2.5 py-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[12px] font-medium">M. García</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-55" />
        </button>
      </div>
    </nav>
  );
}
