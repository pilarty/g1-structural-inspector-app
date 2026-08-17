import React from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PanelTitle, PanelLabel, SecondaryButton } from './components';
import { Folder, ChevronDown } from 'lucide-react';

function Label({ children }: { children: React.ReactNode }) {
  return <PanelLabel className="mb-1.5">{children}</PanelLabel>;
}

function TextInput({ placeholder, type = 'text' }: { placeholder: string; type?: string }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl border border-[#AD8F6E]/25 focus:border-[#AD8F6E]/50 text-[13px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-colors"
    />
  );
}

function SelectInput({ placeholder, options }: { placeholder: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        defaultValue=""
        className="w-full appearance-none px-4 py-2.5 bg-white/60 hover:bg-white/80 rounded-xl border border-[#AD8F6E]/25 text-[13px] text-[#1A1C1E] outline-none transition-colors pr-10"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8C8E] pointer-events-none" />
    </div>
  );
}

interface NewProjectProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCancel: () => void;
}

export default function NewProject({ activeTab, onTabChange, onCancel }: NewProjectProps) {
  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">

        <TopNav />

        {/* Content — single narrow column, centered: deliberately different shape from "Nuevo edificio" */}
        <div className="flex-1 overflow-y-auto bg-[#F3F1ED]">
          <div className="max-w-[560px] mx-auto px-8 py-14">

            {/* Page header */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#AD8F6E]/15 flex items-center justify-center mb-4">
                <Folder className="w-6 h-6 text-[#AD8F6E]" />
              </div>
              <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight">Nuevo proyecto</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1.5 max-w-[380px]">
                Creá un proyecto para agrupar los edificios de un mismo cliente u organización.
              </p>
            </div>

            {/* Card: Datos del proyecto */}
            <div className="bg-[#AD8F6E]/[0.08] border border-[#AD8F6E]/25 rounded-2xl overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-[#AD8F6E]/15">
                <PanelTitle>Datos del proyecto</PanelTitle>
              </div>
              <div className="px-6 py-6 space-y-4">

                <div>
                  <Label>Nombre del proyecto *</Label>
                  <TextInput placeholder="Ej. Consorcio Recoleta Sur" />
                </div>

                <div>
                  <Label>Tipo de cliente</Label>
                  <SelectInput
                    placeholder="Seleccionar"
                    options={['Municipal', 'Consorcio', 'Privado']}
                  />
                </div>

                <div>
                  <Label>Descripción</Label>
                  <textarea
                    rows={3}
                    placeholder="Notas u observaciones sobre el proyecto..."
                    className="w-full px-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl border border-[#AD8F6E]/25 focus:border-[#AD8F6E]/50 text-[13px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-colors resize-none"
                  />
                </div>

              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-5 pt-6">
              <button className="px-6 py-2.5 bg-[#AD8F6E] hover:bg-[#96795C] text-white text-[13px] font-semibold rounded-xl transition-colors">
                Crear proyecto
              </button>
              <SecondaryButton onClick={onCancel}>Cancelar</SecondaryButton>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
