import React from 'react';
import { ChevronDown, Plus } from 'lucide-react';

// ─── Piezas de formulario con el estilo de la pantalla Robot ─────────────────

/** Tarjeta de una sección: icono, título y una línea que explica para qué sirve. */
export function Seccion({ id, icono, titulo, descripcion, children }: {
  id?: string; icono: React.ReactNode; titulo: string; descripcion: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 bg-white rounded-lg border border-[#14202B]/[0.07] shadow-[0_1px_2px_rgba(20,32,43,0.04),0_8px_24px_rgba(20,32,43,0.05)]">
      <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-[#14202B]/[0.06]">
        <span className="flex-none w-8 h-8 rounded-md bg-[#E3EEF8] text-[#377DC0] flex items-center justify-center">{icono}</span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#1A1C1E] leading-tight">{titulo}</h2>
          <p className="text-[12px] text-[#8A8C8E] mt-0.5 leading-snug">{descripcion}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export function Campo({ etiqueta, obligatorio, ayuda, error, children, className = '' }: {
  etiqueta: string; obligatorio?: boolean; ayuda?: React.ReactNode; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-[13px] font-medium text-[#14202B]">
        {etiqueta}
        {obligatorio && <span className="text-[#DC2626] font-semibold"> *</span>}
      </p>
      {children}
      {error
        ? <p className="text-[11px] text-[#991B1B] font-medium mt-1 leading-snug">{error}</p>
        : ayuda && <p className="text-[11px] text-[#8A8C8E] mt-1 leading-snug">{ayuda}</p>}
    </div>
  );
}

export const claseEntrada = (error?: string) =>
  `w-full px-3 rounded-md h-[42px] text-[13px] font-semibold text-[#1A1C1E] bg-[#F8FAFC] focus:bg-white outline-none transition-shadow border placeholder:text-[#A0A2A4] placeholder:font-normal ${
    error
      ? 'border-[#EF4444]/60 focus:ring-2 focus:ring-[#EF4444]/15'
      : 'border-[#377DC0]/15 hover:border-[#377DC0]/35 focus:border-[#377DC0] focus:ring-2 focus:ring-[#377DC0]/15'
  }`;

export function Entrada({ valor, onCambio, onSalir, error, placeholder, modo, sufijo, deshabilitado }: {
  valor: string; onCambio: (v: string) => void; onSalir?: () => void; error?: string; placeholder?: string;
  modo?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel'; sufijo?: string; deshabilitado?: boolean;
}) {
  return (
    <div className="relative">
      <input
        value={valor}
        onChange={e => onCambio(e.target.value)}
        onBlur={onSalir}
        placeholder={placeholder}
        inputMode={modo === 'email' || modo === 'tel' ? undefined : modo}
        type={modo === 'email' ? 'email' : modo === 'tel' ? 'tel' : 'text'}
        disabled={deshabilitado}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={!!error}
        className={`${claseEntrada(error)} ${sufijo ? 'pr-11' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {sufijo && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#8A8C8E] pointer-events-none">{sufijo}</span>}
    </div>
  );
}

export function Selector({ valor, onCambio, onSalir, opciones, placeholder = 'Seleccionar', error }: {
  valor: string; onCambio: (v: string) => void; onSalir?: () => void;
  opciones: { valor: string; etiqueta: string }[]; placeholder?: string; error?: string;
}) {
  return (
    <div className="relative">
      <select
        value={valor}
        onChange={e => onCambio(e.target.value)}
        onBlur={onSalir}
        aria-invalid={!!error}
        className={`${claseEntrada(error)} appearance-none pr-9 ${valor ? '' : 'text-[#A0A2A4] font-normal'}`}
      >
        <option value="" disabled>{placeholder}</option>
        {opciones.map(o => <option key={o.valor} value={o.valor} className="text-[#1A1C1E]">{o.etiqueta}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8C8E] pointer-events-none" />
    </div>
  );
}

export function AreaTexto({ valor, onCambio, placeholder, filas = 3 }: {
  valor: string; onCambio: (v: string) => void; placeholder?: string; filas?: number;
}) {
  return (
    <textarea
      rows={filas}
      value={valor}
      onChange={e => onCambio(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-md text-[13px] font-semibold text-[#1A1C1E] bg-[#F8FAFC] focus:bg-white outline-none transition-shadow border border-[#377DC0]/15 hover:border-[#377DC0]/35 focus:border-[#377DC0] focus:ring-2 focus:ring-[#377DC0]/15 placeholder:text-[#A0A2A4] placeholder:font-normal resize-none"
    />
  );
}

/** Botones excluyentes (como un selector, pero con todas las opciones a la vista). */
export function Segmentado<T extends string>({ valor, onCambio, opciones, error }: {
  valor: T | ''; onCambio: (v: T) => void; opciones: { valor: T; etiqueta: string; icono?: React.ReactNode }[]; error?: string;
}) {
  return (
    <div className={`flex bg-[#F3F6F9] rounded-md p-1 gap-1 border ${error ? 'border-[#EF4444]/60' : 'border-transparent'}`} role="radiogroup">
      {opciones.map(o => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onCambio(o.valor)}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 h-[34px] rounded-lg text-[13px] font-semibold transition-colors ${
            valor === o.valor ? 'bg-[#377DC0] text-white shadow-[0_2px_8px_rgba(55,125,192,0.25)]' : 'text-[#66686A] hover:bg-white'
          }`}
        >
          {o.icono}
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

// ─── Bloques dentro de la tarjeta ────────────────────────────────────────────

export function Cabecera({ numero, titulo, descripcion }: { numero?: number; titulo: string; descripcion?: string }) {
  return (
    <div className="flex items-baseline gap-2.5 min-w-0">
      {numero !== undefined && <span className="flex-none text-[13px] font-bold text-[#377DC0] tabular-nums">{String(numero).padStart(2, '0')}</span>}
      <div className="min-w-0">
        <h2 className="text-[16px] font-bold text-[#1A1C1E] leading-tight">{titulo}</h2>
        {descripcion && <p className="text-[12px] text-[#8A8C8E] mt-0.5 leading-snug">{descripcion}</p>}
      </div>
    </div>
  );
}

/** Sección obligatoria: siempre abierta. */
export function Bloque({ id, numero, titulo, descripcion, children }: {
  id: string; numero?: number; titulo: string; descripcion?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 px-6 py-6 border-b border-[#14202B]/[0.06]">
      <Cabecera numero={numero} titulo={titulo} descripcion={descripcion} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Sección opcional: cerrada hasta que el usuario la abre. */
export function Solapa({ id, numero, titulo, descripcion, abierta, onAlternar, cargados, children }: {
  id: string; numero?: number; titulo: string; descripcion?: string; abierta: boolean; onAlternar: () => void; cargados: number; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 border-b border-[#14202B]/[0.06]">
      <button type="button" onClick={onAlternar} aria-expanded={abierta}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-[#F8FAFC] transition-colors">
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <div className="min-w-0"><Cabecera numero={numero} titulo={titulo} descripcion={descripcion} /></div>
          <span className="flex-none h-[22px] px-2 rounded-[4px] border border-dashed border-[#A0A2A4] text-[11px] font-semibold uppercase tracking-wide text-[#66686A] flex items-center">
            Opcional
          </span>
          {cargados > 0 && (
            <span className="flex-none text-[12px] font-semibold text-[#377DC0]">{cargados} cargado{cargados === 1 ? '' : 's'}</span>
          )}
        </div>
        <span className="flex-none flex items-center gap-1.5 h-8 px-3 rounded-[3px] bg-white border border-[#D4D4D4] text-[13px] font-medium text-[#1A1C1E]">
          {abierta
            ? <><ChevronDown className="w-4 h-4 rotate-180 text-[#66686A]" /> Ocultar</>
            : <><Plus className="w-4 h-4 text-[#377DC0]" /> {cargados > 0 ? 'Ver' : 'Agregar'}</>}
        </span>
      </button>
      {abierta && <div className="px-6 pb-6">{children}</div>}
    </section>
  );
}

/** Campos opcionales plegados dentro de una sección obligatoria. */
export function MasDatos({ id, titulo, abierta, onAlternar, cargados, children }: {
  id: string; titulo: string; abierta: boolean; onAlternar: () => void; cargados: number; children: React.ReactNode;
}) {
  return (
    <div id={id} className="mt-4">
      <button type="button" onClick={onAlternar} aria-expanded={abierta}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-[#377DC0] hover:opacity-75 transition-opacity">
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${abierta ? 'rotate-180' : ''}`} />
        {abierta ? 'Ocultar' : 'Agregar'} {titulo.toLowerCase()}
        <span className="font-normal text-[#A0A2A4]">· opcional{cargados > 0 ? ` · ${cargados} cargado${cargados === 1 ? '' : 's'}` : ''}</span>
      </button>
      {abierta && <div className="mt-4">{children}</div>}
    </div>
  );
}

// ─── Tarjeta única de formulario ──────────────────────────────────────────────

/** La tarjeta blanca que contiene todas las secciones; `pie` va fijo abajo (botones). */
export function TarjetaFormulario({ children, pie }: { children: React.ReactNode; pie: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-[#14202B]/[0.07] shadow-[0_1px_2px_rgba(20,32,43,0.04),0_8px_24px_rgba(20,32,43,0.05)]">
      {children}
      <div className="sticky bottom-0 rounded-b-lg bg-white/95 backdrop-blur-sm border-t border-[#14202B]/[0.06] px-6 py-4 flex items-center gap-4">
        {pie}
      </div>
    </div>
  );
}

/** Selector de fecha (valor AAAA-MM-DD). */
export function Fecha({ valor, onCambio, error, min }: { valor: string; onCambio: (v: string) => void; error?: string; min?: string }) {
  return (
    <input
      type="date"
      value={valor}
      min={min}
      onChange={e => onCambio(e.target.value)}
      aria-invalid={!!error}
      className={claseEntrada(error)}
    />
  );
}
