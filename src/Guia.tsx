import React from 'react';
import { Bot, FolderPlus, ScanLine, Radar, ClipboardCheck, FileDown, OctagonX, ShieldCheck } from 'lucide-react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton } from './components';
import { fechaCorta, type Licencia } from './alquiler';

interface GuiaProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  licencia: Licencia | null;
}

const PASOS: { Icon: React.ElementType; titulo: string; texto: string; ir?: { tab: NavTab; etiqueta: string } }[] = [
  {
    Icon: Bot,
    titulo: 'Recibí el robot',
    texto: 'El robot llega configurado y ya asociado a tu cuenta. Encendelo, conectá la computadora a su puerto de red con un cable '
      + 'Ethernet y poné en la computadora la IP fija 192.168.123.51. En «Iniciar inspección», «Cómo conectar el robot» explica cada paso.',
    ir: { tab: 'inspeccion', etiqueta: 'Iniciar inspección' },
  },
  {
    Icon: FolderPlus,
    titulo: 'Creá el proyecto y la edificación',
    texto: 'Con «Añadir proyecto» cargás los datos del cliente y del profesional a cargo. Dentro del proyecto, '
      + '«Nueva edificación» registra el edificio a inspeccionar, con sus plantas y sus documentos.',
    ir: { tab: 'nuevo-proyecto', etiqueta: 'Añadir proyecto' },
  },
  {
    Icon: ScanLine,
    titulo: 'Iniciá la inspección',
    texto: 'En «Iniciar inspección» elegí la edificación, la planta y el robot. Al confirmar, el robot recorre la planta '
      + 'de forma autónoma mientras arma el mapa y fotografía paredes y columnas.',
    ir: { tab: 'inspeccion', etiqueta: 'Iniciar inspección' },
  },
  {
    Icon: Radar,
    titulo: 'Seguí el recorrido en vivo',
    texto: 'Durante la inspección ves la cámara del robot, su posición sobre el plano y los daños que se van detectando. '
      + 'Cuando termina la planta, tocá «Detener inspección».',
  },
  {
    Icon: ClipboardCheck,
    titulo: 'Revisá los hallazgos',
    texto: 'En «Inspecciones» abrí cada hallazgo, mirá su foto y su ubicación en el plano, y marcalo como '
      + 'confirmado o descartado. También podés indicar la intervención recomendada y su plazo.',
    ir: { tab: 'inspecciones', etiqueta: 'Ver inspecciones' },
  },
  {
    Icon: FileDown,
    titulo: 'Exportá el informe',
    texto: 'Desde el detalle de la inspección, «Descargar informe» genera el PDF con el plano, los hallazgos confirmados '
      + 'y sus fotos. Los resultados quedan guardados aunque termine el alquiler.',
  },
];

export default function Guia({ activeTab, onTabChange, licencia }: GuiaProps) {
  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <div className="flex-1 overflow-y-auto bg-[#F3F4F6]">
          <div className="w-full max-w-[1100px] mx-auto px-6 xl:px-8 pt-7 pb-10">
            <h1 className="text-[24px] font-semibold text-[#0F1A24] tracking-[-0.02em]">Guía de uso</h1>
            <p className="mt-1 text-[14px] text-[#616161]">
              Los pasos para inspeccionar una edificación con el robot Unitree G1, de principio a fin.
            </p>

            {licencia?.activa && (
              <div className="mt-5 flex items-center gap-2.5 rounded-md border border-[#86EFAC] bg-[#F0FDF4] px-4 py-3 text-[14px] text-[#166534]">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                Versión Pro activa hasta el {fechaCorta(licencia.hasta)}.
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3.5 text-[14px] text-[#7F1D1D]">
              <OctagonX className="w-5 h-5 shrink-0 mt-px text-[#DC2626]" />
              <div>
                <p className="font-semibold">Parada de emergencia</p>
                <p className="mt-0.5">
                  El botón rojo de arriba de la barra lateral detiene el robot en cualquier momento y lo deja en modo
                  amortiguado. Usalo ante cualquier situación de riesgo para el robot o para las personas.
                </p>
              </div>
            </div>

            <ol className="mt-6 grid gap-4 md:grid-cols-2">
              {PASOS.map((p, i) => (
                <li key={p.titulo} className="flex flex-col rounded-lg border border-[#E5E7EB] bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#14202B] text-[14px] font-semibold text-white">
                      {i + 1}
                    </span>
                    <p.Icon className="w-5 h-5 text-[#377DC0]" />
                    <h2 className="text-[16px] font-semibold text-[#0F1A24]">{p.titulo}</h2>
                  </div>
                  <p className="mt-3 flex-1 text-[14px] leading-relaxed text-[#374151]">{p.texto}</p>
                  {p.ir && (
                    <button
                      type="button"
                      onClick={() => onTabChange(p.ir!.tab)}
                      className="mt-4 self-start text-[14px] font-medium text-[#377DC0] hover:underline"
                    >
                      {p.ir.etiqueta}
                    </button>
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-7">
              <PrimaryButton onClick={() => onTabChange('dashboard')}>Empezar</PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
