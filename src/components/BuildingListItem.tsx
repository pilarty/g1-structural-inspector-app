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
 * Shows only the building name.
 */
export default function BuildingListItem({ building, isSelected, onClick }: BuildingListItemProps) {
  return (
    <button
      onClick={onClick}
      aria-current={isSelected ? 'page' : undefined}
      className={`w-full flex items-center gap-1.5 h-[32px] pl-[40px] pr-9 text-left ${
        isSelected ? 'bg-[#D6E6F5] outline outline-1 -outline-offset-1 outline-[#377DC0]' : 'hover:bg-black/[0.045]'
      }`}
    >
      <Building2 className="w-4 h-4 flex-none text-[#377DC0]" />
      <span className="text-[14px] truncate min-w-0 flex-1 text-[#1A1C1E]">{building.name}</span>
    </button>
  );
}
