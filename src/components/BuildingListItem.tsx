import React from 'react';
import type { Building } from '../data';

interface BuildingListItemProps {
  building: Building;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Single building row inside the PROYECTOS sidebar tree.
 * Shows only the building name.
 */
export default function BuildingListItem({ building, isSelected, onClick }: BuildingListItemProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 pl-8 pr-4 py-2 transition-colors text-left border-l-2',
        isSelected
          ? 'bg-[#F3F1ED] border-[#1B6E77]'
          : 'hover:bg-[#F8F7F5] border-transparent',
      ].join(' ')}
    >
      <p className={`text-[12px] font-medium truncate leading-snug min-w-0 flex-1 ${isSelected ? 'text-[#1B6E77]' : 'text-[#2D2F31]'}`}>
        {building.name}
      </p>
    </button>
  );
}
