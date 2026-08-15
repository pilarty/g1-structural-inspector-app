import React, { useState } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav } from './components';
import { ChevronDown, Upload, X, FileText } from 'lucide-react';

const GRID_BG = {
  backgroundColor: '#F3F1ED',
  backgroundImage: `linear-gradient(rgba(229,231,235,0.17) 1px, transparent 1px), linear-gradient(90deg, rgba(229,231,235,0.17) 1px, transparent 1px)`,
  backgroundSize: '22px 22px',
} as const;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-semibold text-[#0B5559] uppercase tracking-widest mb-1.5">{children}</p>;
}

function TextInput({ placeholder, type = 'text' }: { placeholder: string; type?: string }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl border border-[#11676A]/15 focus:border-[#11676A]/40 text-[13px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-colors"
    />
  );
}

function SelectInput({ placeholder, options }: { placeholder: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        defaultValue=""
        className="w-full appearance-none px-4 py-2.5 bg-white/60 hover:bg-white/80 rounded-xl border border-[#11676A]/15 text-[13px] text-[#1A1C1E] outline-none transition-colors pr-10"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8C8E] pointer-events-none" />
    </div>
  );
}

interface NewBuildingProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCancel: () => void;
}

export default function NewBuilding({ activeTab, onTabChange, onCancel }: NewBuildingProps) {
  const [dragOver, setDragOver] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const names = Array.from(e.dataTransfer.files).map(f => f.name);
    setAttachedFiles(prev => [...prev, ...names]);
  };

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />

      <div className="flex flex-col flex-1 overflow-hidden">

        <TopNav />

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={GRID_BG}>
          <div className="max-w-[620px] mx-auto px-6 py-8 space-y-4">

            {/* Page header */}
            <div className="mb-6">
              <h1 className="text-[20px] font-bold text-[#1A1C1E] tracking-tight">Nuevo edificio</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1">Completá los datos del edificio para agregarlo al proyecto.</p>
            </div>

            {/* ── Card: Datos obligatorios ── */}
            <div className="bg-[#11676A]/[0.07] border border-[#11676A]/20 backdrop-blur-md rounded-2xl overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-[#11676A]/10">
                <span className="text-[13px] font-semibold text-[#1A1C1E]">Datos del edificio</span>
              </div>
              <div className="px-5 py-4 space-y-4">

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Nombre del edificio *</Label>
                    <TextInput placeholder="Ej. Edificio Corrientes 1234" />
                  </div>
                  <div>
                    <Label>Dirección *</Label>
                    <TextInput placeholder="Av. Corrientes 1234, CABA" />
                  </div>
                  <div>
                    <Label>Organización / Proyecto *</Label>
                    <SelectInput
                      placeholder="Seleccionar proyecto"
                      options={['Municipalidad CABA — Zona Norte', 'Consorcio San Telmo', 'Privado — Estudio Vidal & Asoc.']}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cantidad de plantas *</Label>
                    <TextInput type="number" placeholder="8" />
                  </div>
                  <div>
                    <Label>Año de construcción *</Label>
                    <TextInput type="number" placeholder="1978" />
                  </div>
                </div>

              </div>
            </div>

            {/* ── Card: Información adicional ── */}
            <div className="bg-[#11676A]/[0.07] border border-[#11676A]/20 backdrop-blur-md rounded-2xl overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-[#11676A]/10 flex items-center gap-3">
                <span className="text-[13px] font-semibold text-[#1A1C1E]">Información adicional</span>
                <span className="text-[10px] font-semibold text-[#8A8C8E] bg-white/50 px-2 py-0.5 rounded-md">Opcional</span>
              </div>
              <div className="px-5 py-4 space-y-4">

                {/* File upload */}
                <div>
                  <Label>Adjuntar plano(s)</Label>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                      dragOver
                        ? 'border-[#11676A]/60 bg-[#11676A]/10'
                        : 'border-[#11676A]/20 bg-white/30 hover:bg-white/50 hover:border-[#11676A]/35'
                    }`}
                  >
                    <Upload className="w-5 h-5 text-[#11676A]/60" />
                    <p className="text-[12px] font-medium text-[#66686A] text-center">
                      Arrastrá archivos aquí o <span className="text-[#11676A] font-semibold">buscá en tu dispositivo</span>
                    </p>
                    <p className="text-[10px] text-[#A0A2A4]">PDF, DWG, DXF, JPG, PNG — hasta 50 MB por archivo</p>
                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png" onChange={e => {
                      const names = Array.from(e.target.files ?? []).map(f => f.name);
                      setAttachedFiles(prev => [...prev, ...names]);
                    }} />
                  </div>
                  {attachedFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachedFiles.map((name, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg">
                          <FileText className="w-3.5 h-3.5 text-[#11676A] flex-none" />
                          <span className="text-[12px] text-[#1A1C1E] flex-1 truncate">{name}</span>
                          <button onClick={() => setAttachedFiles(p => p.filter((_, j) => j !== i))} className="text-[#8A8C8E] hover:text-[#1A1C1E] transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de estructura</Label>
                    <SelectInput
                      placeholder="Seleccionar"
                      options={['Hormigón armado', 'Mampostería', 'Madera', 'Mixta']}
                    />
                  </div>
                  <div>
                    <Label>Motivo del relevamiento</Label>
                    <SelectInput
                      placeholder="Seleccionar"
                      options={['Sismo', 'Incendio', 'Inspección de rutina', 'Denuncia']}
                    />
                  </div>
                </div>

                <div>
                  <Label>Notas generales</Label>
                  <textarea
                    rows={3}
                    placeholder="Observaciones relevantes sobre el edificio o el contexto del relevamiento..."
                    className="w-full px-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl border border-[#11676A]/15 focus:border-[#11676A]/40 text-[13px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-colors resize-none"
                  />
                </div>

              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-5 pt-1">
              <button className="px-6 py-2.5 bg-[#11676A] hover:bg-[#0E5254] text-white text-[13px] font-semibold rounded-xl transition-colors">
                Guardar edificio
              </button>
              <button
                onClick={onCancel}
                className="text-[13px] font-medium text-[#8A8C8E] hover:text-[#1A1C1E] transition-colors"
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
