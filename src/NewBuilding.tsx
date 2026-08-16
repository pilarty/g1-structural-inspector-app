import React, { useState } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, TurquoiseCard, PanelTitle, PanelLabel, PrimaryButton, SecondaryButton } from './components';
import { ChevronDown, Upload, X, FileText, Building2 } from 'lucide-react';

function Label({ children }: { children: React.ReactNode }) {
  return <PanelLabel className="mb-1.5">{children}</PanelLabel>;
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
        <div className="flex-1 overflow-y-auto bg-[#F3F1ED]">
          <div className="max-w-[1120px] mx-auto px-8 py-8">

            {/* Page header */}
            <div className="mb-6">
              <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight">Nuevo edificio</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1">Completá los datos del edificio para agregarlo al proyecto.</p>
            </div>

            {/* ── Two-column layout ── */}
            <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-5 items-start">

              {/* ── Card: Datos obligatorios ── */}
              <TurquoiseCard size="lg">
                <div className="px-5 pt-4 pb-3 border-b border-[#11676A]/10 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#11676A]" />
                  <PanelTitle>Datos del edificio</PanelTitle>
                </div>
                <div className="px-5 py-5 space-y-4">

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

                  <div className="grid grid-cols-2 gap-3">
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
              </TurquoiseCard>

              {/* ── Card: Información adicional ── */}
              <TurquoiseCard size="lg">
                <div className="px-5 pt-4 pb-3 border-b border-[#11676A]/10 flex items-center gap-3">
                  <PanelTitle>Información adicional</PanelTitle>
                  <span className="text-[10px] font-normal text-[#8A8C8E] bg-white/50 px-2 py-0.5 rounded-md">Opcional</span>
                </div>
                <div className="px-5 py-5 space-y-4">

                  <div className="grid grid-cols-2 gap-3">
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

                  <div>
                    <Label>Notas generales</Label>
                    <textarea
                      rows={3}
                      placeholder="Observaciones relevantes sobre el edificio o el contexto del relevamiento..."
                      className="w-full px-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl border border-[#11676A]/15 focus:border-[#11676A]/40 text-[13px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-colors resize-none"
                    />
                  </div>

                </div>
              </TurquoiseCard>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-5 pt-5">
              <PrimaryButton>Guardar edificio</PrimaryButton>
              <SecondaryButton onClick={onCancel}>Cancelar</SecondaryButton>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
