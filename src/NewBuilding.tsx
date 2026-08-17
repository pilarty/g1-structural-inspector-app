import React, { useState } from 'react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, TurquoiseCard, PanelTitle, PanelLabel, PrimaryButton, SecondaryButton } from './components';
import { ChevronDown, Upload, X, FileText, Building2, Home } from 'lucide-react';

type PropertyType = 'casa' | 'edificio';

const propertyTypeOptions: { value: PropertyType; label: string; icon: React.ReactNode }[] = [
  { value: 'casa', label: 'Casa', icon: <Home className="w-3.5 h-3.5" /> },
  { value: 'edificio', label: 'Edificio', icon: <Building2 className="w-3.5 h-3.5" /> },
];

function Label({ children }: { children: React.ReactNode }) {
  return <PanelLabel className="mb-1.5">{children}</PanelLabel>;
}

function TextInput({ placeholder, type = 'text' }: { placeholder: string; type?: string }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl border border-[#1B6E77]/15 focus:border-[#1B6E77]/40 text-[13px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-colors"
    />
  );
}

function SelectInput({ placeholder, options }: { placeholder: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        defaultValue=""
        className="w-full appearance-none px-4 py-2.5 bg-white/60 hover:bg-white/80 rounded-xl border border-[#1B6E77]/15 text-[13px] text-[#1A1C1E] outline-none transition-colors pr-10"
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
  const [propertyType, setPropertyType] = useState<PropertyType>('edificio');

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
              <h1 className="text-[22px] font-bold text-[#1A1C1E] tracking-tight">Nueva edificación</h1>
              <p className="text-[13px] text-[#8A8C8E] mt-1">Completá los datos del edificio para agregarlo al proyecto.</p>
            </div>

            {/* ── Two-column layout ── */}
            <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-5 items-start">

              {/* ── Card: Datos obligatorios ── */}
              <TurquoiseCard size="lg">
                <div className="px-5 pt-4 pb-3 border-b border-[#1B6E77]/10 flex items-center gap-2">
                  <PanelTitle>Datos de la edificación</PanelTitle>
                </div>
                <div className="px-5 py-5 space-y-4">

                  <div>
                    <Label>Nombre de referencia *</Label>
                    <TextInput placeholder="Ej. Edificio Corrientes 1234" />
                  </div>

                  <div>
                    <Label>Tipo de propiedad *</Label>
                    <div className="flex bg-white/40 rounded-xl p-1 gap-1">
                      {propertyTypeOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPropertyType(opt.value)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                            propertyType === opt.value
                              ? 'bg-[#1B6E77] text-white'
                              : 'text-[#66686A] hover:bg-white/70'
                          }`}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Dirección *</Label>
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-[1fr_120px] gap-2.5">
                        <TextInput placeholder="Calle" />
                        <TextInput placeholder="Número" />
                      </div>
                      {propertyType === 'edificio' && (
                        <TextInput placeholder="Piso / Departamento" />
                      )}
                      <div className="grid grid-cols-2 gap-2.5">
                        <TextInput placeholder="Localidad" />
                        <TextInput placeholder="Provincia / Ciudad" />
                      </div>
                      <TextInput placeholder="País" />
                    </div>
                  </div>

                  <div>
                    <Label>Proyecto *</Label>
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
                <div className="px-5 pt-4 pb-3 border-b border-[#1B6E77]/10 flex items-center gap-3">
                  <PanelTitle>Información adicional</PanelTitle>
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
                          ? 'border-[#1B6E77]/60 bg-[#1B6E77]/10'
                          : 'border-[#1B6E77]/20 bg-white/30 hover:bg-white/50 hover:border-[#1B6E77]/35'
                      }`}
                    >
                      <Upload className="w-5 h-5 text-[#1B6E77]/60" />
                      <p className="text-[12px] font-medium text-[#66686A] text-center">
                        Arrastrá archivos aquí o <span className="text-[#1B6E77] font-semibold">buscá en tu dispositivo</span>
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
                            <FileText className="w-3.5 h-3.5 text-[#1B6E77] flex-none" />
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
                      className="w-full px-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 rounded-xl border border-[#1B6E77]/15 focus:border-[#1B6E77]/40 text-[13px] text-[#1A1C1E] placeholder:text-[#A0A2A4] outline-none transition-colors resize-none"
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
