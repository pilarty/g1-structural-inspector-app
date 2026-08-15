import React from 'react';
import { Building2 } from 'lucide-react';
import type { Building } from '../data';

interface BuildingListItemProps {
  building: Building;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Single building row inside the PROYECTOS sidebar tree.
 * Shows building icon, name, and last-relevamiento summary.
 */
export default function BuildingListItem({ building, isSelected, onClick }: BuildingListItemProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 pl-8 pr-4 py-2 transition-colors text-left border-l-2',
        isSelected
          ? 'bg-[#F3F1ED] border-[#11676A]'
          : 'hover:bg-[#F8F7F5] border-transparent',
      ].join(' ')}
    >
      {/* Building icon */}
      <div className="w-7 h-7 rounded-lg flex-none bg-[#F3F1ED] border border-[#E8E5DF] flex items-center justify-center">
        <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-[#11676A]' : 'text-[#8A8C8E]'}`} />
      </div>

      {/* Label + sublabel */}
      <div className="min-w-0 flex-1">
        <p className={`text-[12px] font-medium truncate leading-snug ${isSelected ? 'text-[#11676A]' : 'text-[#2D2F31]'}`}>
          {building.name}
        </p>
        <p className="text-[10px] text-[#8A8C8E] truncate leading-none mt-0.5">
          {building.relevamientos > 0
            ? `${building.relevamientos} relev. · ${building.lastRelevamiento}`
            : 'Sin relevamientos'}
        </p>
      </div>
    </button>
  );
}
